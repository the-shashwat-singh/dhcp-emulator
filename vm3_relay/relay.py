#!/usr/bin/env python3
import os
import sys
from datetime import datetime
import requests

os.environ["PATH"] += os.pathsep + "/home/shashwat/.local/bin"
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from scapy.all import sniff, sendp, get_if_hwaddr
from scapy.layers.l2 import Ether
from scapy.layers.inet import IP, UDP
from scapy.layers.dhcp import BOOTP, DHCP

from shared.dhcp_constants import DHCP_MSG_DISCOVER, DHCP_MSG_REQUEST, DHCP_MSG_OFFER, DHCP_MSG_ACK
from shared.analyser import parse_packet
import config

def get_mac(iface):
    try:
        with open(f'/sys/class/net/{iface}/address') as f:
            return f.read().strip()
    except Exception:
        return get_if_hwaddr(iface)

RELAY_MAC = get_mac(config.IFACE)

def post_event(event_name, pkt, meta=None):
    if meta is None:
        meta = {}
    parsed_pkt = parse_packet(pkt)
    if not parsed_pkt:
        return
        
    if BOOTP in pkt:
        parsed_pkt["xid"] = hex(pkt[BOOTP].xid)
        
    payload = {
        "event": event_name,
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "from_node": "relay",
        "to_node": "server" if "SERVER" in event_name or pkt[BOOTP].op == 1 else "client",
        "packet": parsed_pkt,
        "meta": meta
    }

    try:
        requests.post(config.MAC_BACKEND_URL, json=payload, timeout=2)
    except Exception as e:
        print(f"[!] Failed to post event {event_name}: {e}")

def get_dhcp_option(options, key_or_code):
    for opt in options:
        if isinstance(opt, tuple) and opt[0] == key_or_code:
            return opt[1]
    return None

def inject_option82(options):
    circuit_id_bytes = config.IFACE.encode('ascii')
    remote_id_bytes = bytes.fromhex(RELAY_MAC.replace(':', ''))
    
    # Suboption 1: Circuit ID
    sub1 = b'\x01' + bytes([len(circuit_id_bytes)]) + circuit_id_bytes
    # Suboption 2: Remote ID
    sub2 = b'\x02' + bytes([len(remote_id_bytes)]) + remote_id_bytes
    
    opt82_value = sub1 + sub2
    
    new_options = []
    for opt in options:
        if opt == 'end':
            new_options.append((82, opt82_value))
            new_options.append('end')
        else:
            new_options.append(opt)
    return new_options, opt82_value

def handle_dhcp_packet(pkt):
    if DHCP not in pkt:
        return

    # Ignore packets sent by the relay itself to prevent loops
    if pkt.haslayer(Ether) and pkt[Ether].src == RELAY_MAC:
        return

    msg_type = get_dhcp_option(pkt[DHCP].options, 'message-type')
    if not msg_type:
        return

    xid_hex = hex(pkt[BOOTP].xid)
    op = pkt[BOOTP].op

    # BOOTREQUEST from client to server (op=1)
    if op == 1 and pkt[BOOTP].giaddr == "0.0.0.0":
        print(f"[*] Received REQUEST/DISCOVER from client. Injecting Option 82.")
        
        # Modify the packet
        pkt[BOOTP].hops += 1
        pkt[BOOTP].giaddr = config.RELAY_IP
        
        new_opts, opt82_val = inject_option82(pkt[DHCP].options)
        pkt[DHCP].options = new_opts
        
        # Build forwarded packet (unicast to server)
        fwd_pkt = Ether(src=RELAY_MAC, dst="ff:ff:ff:ff:ff:ff") / \
                  IP(src=config.RELAY_IP, dst=config.SERVER_IP) / \
                  UDP(sport=67, dport=67) / \
                  pkt[BOOTP]
        
        # Force scapy to recalculate lengths and checksums
        del fwd_pkt[IP].len
        del fwd_pkt[IP].chksum
        del fwd_pkt[UDP].len
        del fwd_pkt[UDP].chksum
        
        post_event("OPTION82_INSERTED", fwd_pkt, {"xid": xid_hex})
        print(f"[*] Forwarding to Server: {config.SERVER_IP}")
        sendp(fwd_pkt, iface=config.IFACE, verbose=False)

    # BOOTREPLY from server to client (op=2)
    elif op == 2 and pkt[BOOTP].giaddr == config.RELAY_IP:
        print(f"[*] Received REPLY from server. Forwarding to client.")
        
        # Check flags (Broadcast = 0x8000)
        is_broadcast = (pkt[BOOTP].flags & 0x8000) != 0
        client_mac = ':'.join(f'{b:02x}' for b in pkt[BOOTP].chaddr[:6])
        dst_mac = "ff:ff:ff:ff:ff:ff" if is_broadcast else client_mac
        dst_ip = "255.255.255.255" if is_broadcast else pkt[BOOTP].yiaddr
        
        fwd_pkt = Ether(src=RELAY_MAC, dst=dst_mac) / \
                  IP(src=config.RELAY_IP, dst=dst_ip) / \
                  UDP(sport=67, dport=68) / \
                  pkt[BOOTP]
                  
        del fwd_pkt[IP].len
        del fwd_pkt[IP].chksum
        del fwd_pkt[UDP].len
        del fwd_pkt[UDP].chksum
        
        print(f"[*] Forwarding to Client: {dst_ip}")
        msg_type_code = get_dhcp_option(pkt[DHCP].options, 'message-type')
        if msg_type_code == DHCP_MSG_OFFER:
            post_event("OFFER_SENT", fwd_pkt, {"xid": xid_hex})
        elif msg_type_code == DHCP_MSG_ACK:
            post_event("ACK_SENT", fwd_pkt, {"xid": xid_hex})
        sendp(fwd_pkt, iface=config.IFACE, verbose=False)

if __name__ == "__main__":
    print(f"[*] Starting DHCP Relay Agent on {config.IFACE} (Relay IP: {config.RELAY_IP})")
    sniff(iface=config.IFACE, filter="udp and (port 67 or port 68)", prn=handle_dhcp_packet, store=0)
