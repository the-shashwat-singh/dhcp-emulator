#!/usr/bin/env python3
import os
import sys
import time
import struct
import random
import subprocess
from datetime import datetime
import requests
import signal

os.environ["PATH"] += os.pathsep + "/home/shashwat/.local/bin"
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from scapy.all import sniff, sendp, get_if_hwaddr
from scapy.layers.l2 import Ether
from scapy.layers.inet import IP, UDP
from scapy.layers.dhcp import BOOTP, DHCP

from shared.dhcp_constants import DHCP_MSG_DISCOVER, DHCP_MSG_REQUEST, DHCP_MSG_OFFER, DHCP_MSG_ACK
from shared.analyser import parse_packet
import config

MGMT_IP = "192.168.128.50"
MGMT_PREFIX = "24"

def restore_management_ip():
    """Always restore management IP regardless of DORA outcome."""
    subprocess.run(
        ['sudo', 'ip', 'addr', 'add', f'{MGMT_IP}/{MGMT_PREFIX}', 'dev', config.IFACE],
        capture_output=True
    )
    subprocess.run(['sudo', 'ip', 'link', 'set', config.IFACE, 'up'], capture_output=True)

def get_mac(iface):
    try:
        with open(f'/sys/class/net/{iface}/address') as f:
            return f.read().strip()
    except Exception:
        return get_if_hwaddr(iface)

CLIENT_MAC = get_mac(config.IFACE)
CLIENT_MAC_BYTES = bytes.fromhex(CLIENT_MAC.replace(':', ''))

# Global state
CLIENT_XID = random.randint(0, 0xFFFFFFFF)
CURRENT_STATE = "INIT"
OFFERED_IP = None
SERVER_IP = None

def post_event(event_name, pkt, meta=None):
    if meta is None:
        meta = {}
    parsed_pkt = parse_packet(pkt)
    if not parsed_pkt:
        return
        
    payload = {
        "event": event_name,
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "from_node": "client",
        "to_node": "server",
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

def assign_ip(ip, mask, gateway):
    prefix = sum(bin(int(x)).count('1') for x in mask.split('.')) if mask else 24
    print(f"[*] Assigning DHCP IP {ip}/{prefix} and gateway {gateway} on {config.IFACE}...")
    subprocess.run(['sudo', 'ip', 'addr', 'add', f'{ip}/{prefix}', 'dev', config.IFACE], check=False)

HAS_SENT_DISCOVER = False
def send_discover():
    global CURRENT_STATE, CLIENT_XID, HAS_SENT_DISCOVER
    if HAS_SENT_DISCOVER: return
    HAS_SENT_DISCOVER = True
    CURRENT_STATE = "SELECTING"
    CLIENT_XID = random.randint(0, 0xFFFFFFFF)
    
    pkt = Ether(dst='ff:ff:ff:ff:ff:ff', src=CLIENT_MAC) / \
          IP(src='0.0.0.0', dst='255.255.255.255') / \
          UDP(sport=68, dport=67) / \
          BOOTP(op=1, chaddr=CLIENT_MAC_BYTES + b'\x00'*10, xid=CLIENT_XID, flags=0x8000) / \
          DHCP(options=[
              ('message-type', DHCP_MSG_DISCOVER),
              ('param_req_list', [1, 3, 6, 15, 28, 51, 54, 58, 59]),
              ('hostname', b'dhcp-client'),
              ('client_id', b'\x01' + CLIENT_MAC_BYTES),
              'end'
          ])
          
    print(f"[*] Sending DISCOVER (XID: {hex(CLIENT_XID)})")
    sendp(pkt, iface=config.IFACE, verbose=False, count=1)
    post_event("DISCOVER_SENT", pkt, {"xid": hex(CLIENT_XID)})

HAS_SENT_REQUEST = False
def send_request():
    global CURRENT_STATE, HAS_SENT_REQUEST
    if HAS_SENT_REQUEST: return
    HAS_SENT_REQUEST = True
    CURRENT_STATE = "REQUESTING"
    
    pkt = Ether(dst='ff:ff:ff:ff:ff:ff', src=CLIENT_MAC) / \
          IP(src='0.0.0.0', dst='255.255.255.255') / \
          UDP(sport=68, dport=67) / \
          BOOTP(op=1, chaddr=CLIENT_MAC_BYTES + b'\x00'*10, xid=CLIENT_XID, flags=0x8000) / \
          DHCP(options=[
              ('message-type', DHCP_MSG_REQUEST),
              ('requested_addr', OFFERED_IP),
              ('server_id', SERVER_IP),
              ('param_req_list', [1, 3, 6, 15, 28, 51, 54, 58, 59]),
              ('hostname', b'dhcp-client'),
              ('client_id', b'\x01' + CLIENT_MAC_BYTES),
              'end'
          ])
          
    print(f"[*] Sending REQUEST for {OFFERED_IP} to server {SERVER_IP}")
    sendp(pkt, iface=config.IFACE, verbose=False, count=1)
    post_event("REQUEST_SENT", pkt, {"xid": hex(CLIENT_XID), "requested_ip": OFFERED_IP})

def handle_dhcp_packet(pkt):
    global CURRENT_STATE, OFFERED_IP, SERVER_IP
    
    if DHCP not in pkt:
        return

    if pkt[BOOTP].xid != CLIENT_XID:
        return
        
    # We only care about replies from server (op=2)
    if pkt[BOOTP].op != 2:
        return

    msg_type = get_dhcp_option(pkt[DHCP].options, 'message-type')
    
    if msg_type == DHCP_MSG_OFFER and CURRENT_STATE == "SELECTING":
        OFFERED_IP = pkt[BOOTP].yiaddr
        SERVER_IP = get_dhcp_option(pkt[DHCP].options, 'server_id')
        print(f"[*] Received OFFER for IP {OFFERED_IP} from Server {SERVER_IP}")
        # Note: the to/from logic in the server assumes from_node based on where it hits.
        # But we log it anyway.
        send_request()
        
    elif msg_type == DHCP_MSG_ACK and CURRENT_STATE == "REQUESTING":
        CURRENT_STATE = "BOUND"
        assigned_ip = pkt[BOOTP].yiaddr
        subnet = get_dhcp_option(pkt[DHCP].options, 'subnet_mask')
        router = get_dhcp_option(pkt[DHCP].options, 'router')
        print(f"[*] Received ACK. Assigned IP: {assigned_ip}")
        
        assign_ip(assigned_ip, subnet, router)
        
        try:
            requests.post(config.MAC_BACKEND_URL, json={
                "event": "IP_ASSIGNED",
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "meta": {
                    "assigned_ip": assigned_ip,
                    "subnet": subnet,
                    "router": router,
                    "xid": hex(CLIENT_XID)
                }
            }, timeout=2)
        except:
            pass
            
        print("[*] DORA Complete. Exiting sniff.")
        sys.exit(0)

def inject_packet(payload):
    """
    payload is a dict containing:
    - type: "DISCOVER", "REQUEST", "RELEASE", "DECLINE", "INFORM"
    - mac: optional string
    - xid: optional string (hex)
    - requested_ip: optional string
    - server_id: optional string
    """
    msg_type_str = payload.get("type", "DISCOVER").upper()
    mac_str = payload.get("mac", CLIENT_MAC)
    mac_bytes = bytes.fromhex(mac_str.replace(':', ''))
    
    xid_str = payload.get("xid")
    if xid_str:
        xid = int(xid_str, 16)
    else:
        xid = random.randint(0, 0xFFFFFFFF)
        
    requested_ip = payload.get("requested_ip")
    server_id = payload.get("server_id")
    
    # Map msg_type_str to int
    type_map = {
        "DISCOVER": 1,
        "REQUEST": 3,
        "DECLINE": 4,
        "ACK": 5,
        "RELEASE": 7,
        "INFORM": 8
    }
    msg_type = type_map.get(msg_type_str, 1)
    
    options = [('message-type', msg_type)]
    if requested_ip:
        options.append(('requested_addr', requested_ip))
    if server_id:
        options.append(('server_id', server_id))
    
    if msg_type_str in ["DISCOVER", "REQUEST", "INFORM"]:
        options.append(('param_req_list', [1, 3, 6, 15, 28, 51, 54, 58, 59]))
        
    options.append(('hostname', b'dhcp-client'))
    options.append(('client_id', b'\x01' + mac_bytes))
    options.append('end')
    
    # Send to broadcast or unicast based on type?
    # Usually clients broadcast DISCOVER/REQUEST.
    # We will just broadcast everything to ff:ff:ff:ff:ff:ff and 255.255.255.255
    pkt = Ether(dst='ff:ff:ff:ff:ff:ff', src=mac_str) / \
          IP(src='0.0.0.0', dst='255.255.255.255') / \
          UDP(sport=68, dport=67) / \
          BOOTP(op=1, chaddr=mac_bytes + b'\x00'*10, xid=xid, flags=0x8000) / \
          DHCP(options=options)
          
    print(f"[*] Injecting {msg_type_str} packet (XID: {hex(xid)})")
    sendp(pkt, iface=config.IFACE, verbose=False)
    post_event(f"{msg_type_str}_SENT", pkt, {"xid": hex(xid)})

def sigterm_handler(signum, frame):
    raise Exception(f"Process killed with signal {signum}")

def run_dora():
    signal.signal(signal.SIGTERM, sigterm_handler)
    signal.signal(signal.SIGINT, sigterm_handler)
    
    try:
        print(f"[*] Flushing IP on {config.IFACE}...")
        subprocess.run(['sudo', 'ip', 'addr', 'flush', 'dev', config.IFACE], check=True)
        subprocess.run(['sudo', 'ip', 'link', 'set', config.IFACE, 'promisc', 'on'], check=True)

        from scapy.all import AsyncSniffer
        print("[*] Waiting for DHCP replies...")
        # Start sniffing in the background before sending the discover
        sniffer = AsyncSniffer(iface=config.IFACE, filter="udp and (port 67 or port 68)", prn=handle_dhcp_packet, store=0, timeout=30)
        sniffer.start()
        
        # Give the sniffer a moment to initialize
        time.sleep(0.5)
        send_discover()
        
        sniffer.join()
        
        if CURRENT_STATE != "BOUND":
            raise Exception("DORA Exchange timed out after 10 seconds.")
    except Exception as e:
        import traceback
        traceback.print_exc()
        try:
            requests.post(config.MAC_BACKEND_URL, json={
                "event": "DORA_FAILED",
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "meta": {"error": str(e)}
            }, timeout=2)
        except:
            pass
        raise
    finally:
        subprocess.run(['sudo', 'ip', 'link', 'set', config.IFACE, 'promisc', 'off'], capture_output=True)
        print(f"[*] Restoring Management IP {MGMT_IP}/{MGMT_PREFIX} on {config.IFACE}...")
        restore_management_ip()

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--inject", type=str, help="JSON payload to inject a single packet")
    args = parser.parse_args()
    
    if args.inject:
        import json
        payload = json.loads(args.inject)
        inject_packet(payload)
        sys.exit(0)

    run_dora()
