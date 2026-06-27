#!/usr/bin/env python3
import json
import os
import sys
import struct
import socket
from datetime import datetime
import requests
import ipaddress
import threading
import time

lease_lock = threading.Lock()

# Add local bin to path (as requested constraint 8)
os.environ["PATH"] += os.pathsep + "/home/shashwat/.local/bin"

# Must append parent directory to sys.path to import shared modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from scapy.all import sniff, sendp, get_if_hwaddr
from scapy.layers.l2 import Ether
from scapy.layers.inet import IP, UDP
from scapy.layers.dhcp import BOOTP, DHCP

from shared.dhcp_constants import DHCP_MSG_TYPES, DHCP_MSG_DISCOVER, DHCP_MSG_REQUEST, DHCP_MSG_RELEASE, DHCP_MSG_DECLINE, DHCP_MSG_INFORM, DHCP_MSG_OFFER, DHCP_MSG_ACK
from shared.analyser import parse_packet
import config

def get_mac(iface):
    try:
        with open(f'/sys/class/net/{iface}/address') as f:
            return f.read().strip()
    except Exception:
        return get_if_hwaddr(iface)

SERVER_MAC = get_mac(config.IFACE)

LEASES_FILE_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), config.LEASES_FILE)

def load_leases():
    if os.path.exists(LEASES_FILE_PATH):
        with open(LEASES_FILE_PATH, 'r') as f:
            return json.load(f)
    return {}

def save_leases(leases):
    with open(LEASES_FILE_PATH, 'w') as f:
        json.dump(leases, f, indent=2)

HISTORY_FILE_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'lease_history.json')

def load_history():
    if os.path.exists(HISTORY_FILE_PATH):
        try:
            with open(HISTORY_FILE_PATH, 'r') as f:
                return json.load(f)
        except Exception:
            return []
    return []

def save_history(history):
    with open(HISTORY_FILE_PATH, 'w') as f:
        json.dump(history, f, indent=2)

def append_to_history_nolock(mac, ip, assigned_at, ended_at, reason):
    history = load_history()
    history.append({
        "mac": mac,
        "ip": ip,
        "assigned_at": assigned_at,
        "ended_at": ended_at,
        "reason": reason
    })
    save_history(history)

def cleanup_expired_leases():
    while True:
        time.sleep(60)
        now_str = datetime.utcnow().isoformat() + "Z"
        with lease_lock:
            leases = load_leases()
            expired = []
            for mac, lease in list(leases.items()):
                if lease.get('expires_at', '9999') < now_str:
                    expired.append((mac, lease))
            for mac, lease in expired:
                del leases[mac]
                append_to_history_nolock(mac, lease['ip'], lease.get('assigned_at', ''), now_str, "EXPIRED")
            if expired:
                save_leases(leases)
                print(f"[*] Cleaned up {len(expired)} expired leases")

threading.Thread(target=cleanup_expired_leases, daemon=True).start()


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
        "from_node": "server",
        "to_node": "client" if pkt[BOOTP].giaddr == "0.0.0.0" else "relay",
        "packet": parsed_pkt,
        "meta": meta
    }
    
    # In REQUEST/ACK we can be receiving from client
    if "RECEIVED" in event_name:
        payload["from_node"] = "client" if pkt[BOOTP].giaddr == "0.0.0.0" else "relay"
        payload["to_node"] = "server"

    try:
        requests.post(config.MAC_BACKEND_URL, json=payload, timeout=2)
    except Exception as e:
        print(f"[!] Failed to post event {event_name}: {e}")

def get_dhcp_option(options, key_or_code):
    for opt in options:
        if isinstance(opt, tuple) and opt[0] == key_or_code:
            return opt[1]
    return None

def extract_option82(options):
    for opt in options:
        if isinstance(opt, tuple) and opt[0] == 82: # relay_agent_information (or 82 directly)
            return opt[1]
        elif isinstance(opt, tuple) and opt[0] == 'relay_agent_Information':
            return opt[1]
    return None

def build_offer(discover_pkt, offered_ip):
    # RFC 2131 Section 4.3.1
    client_mac = discover_pkt[Ether].src
    xid = discover_pkt[BOOTP].xid
    chaddr = discover_pkt[BOOTP].chaddr
    giaddr = discover_pkt[BOOTP].giaddr
    
    # Send to broadcast unless giaddr is present
    dst_mac = "ff:ff:ff:ff:ff:ff" if giaddr == "0.0.0.0" else discover_pkt[Ether].src
    dst_ip = "255.255.255.255" if giaddr == "0.0.0.0" else giaddr

    dhcp_options = [
        ('message-type', DHCP_MSG_OFFER),
        ('server_id', config.SERVER_IP),
        ('lease_time', config.LEASE_TIME),
        ('renewal_time', config.RENEWAL_TIME),
        ('rebinding_time', config.REBINDING_TIME),
        ('subnet_mask', config.NETMASK),
        ('router', config.GATEWAY),
        ('name_server', config.DNS_SERVERS[0], config.DNS_SERVERS[1]),
        ('broadcast_address', config.BROADCAST)
    ]
    
    # Echo option 82 if present (RFC 3046 Section 2.2)
    opt82 = extract_option82(discover_pkt[DHCP].options)
    if opt82:
        dhcp_options.append((82, opt82))
        
    dhcp_options.append('end')

    pkt = Ether(src=SERVER_MAC, dst=dst_mac) / \
          IP(src=config.SERVER_IP, dst=dst_ip) / \
          UDP(sport=67, dport=67 if giaddr != "0.0.0.0" else 68) / \
          BOOTP(op=2, 
                yiaddr=offered_ip,
                siaddr=config.SERVER_IP,
                giaddr=giaddr,
                chaddr=chaddr,
                xid=xid) / \
          DHCP(options=dhcp_options)
    return pkt

def build_ack(request_pkt, assigned_ip):
    # RFC 2131 Section 4.3.2
    client_mac = request_pkt[Ether].src
    xid = request_pkt[BOOTP].xid
    chaddr = request_pkt[BOOTP].chaddr
    giaddr = request_pkt[BOOTP].giaddr
    
    dst_mac = "ff:ff:ff:ff:ff:ff" if giaddr == "0.0.0.0" else request_pkt[Ether].src
    dst_ip = "255.255.255.255" if giaddr == "0.0.0.0" else giaddr

    dhcp_options = [
        ('message-type', DHCP_MSG_ACK),
        ('server_id', config.SERVER_IP),
        ('lease_time', config.LEASE_TIME),
        ('renewal_time', config.RENEWAL_TIME),
        ('rebinding_time', config.REBINDING_TIME),
        ('subnet_mask', config.NETMASK),
        ('router', config.GATEWAY),
        ('name_server', config.DNS_SERVERS[0], config.DNS_SERVERS[1]),
        ('broadcast_address', config.BROADCAST)
    ]

    # Echo option 82 if present
    opt82 = extract_option82(request_pkt[DHCP].options)
    if opt82:
        dhcp_options.append((82, opt82))
        
    dhcp_options.append('end')

    pkt = Ether(src=SERVER_MAC, dst=dst_mac) / \
          IP(src=config.SERVER_IP, dst=dst_ip) / \
          UDP(sport=67, dport=67 if giaddr != "0.0.0.0" else 68) / \
          BOOTP(op=2, 
                yiaddr=assigned_ip,
                siaddr=config.SERVER_IP,
                giaddr=giaddr,
                chaddr=chaddr,
                xid=xid) / \
          DHCP(options=dhcp_options)
    return pkt

def handle_dhcp_packet(pkt):
    try:
        _handle_dhcp_packet_internal(pkt)
    except Exception as e:
        print(f"[!] Error handling packet: {e}")
        import traceback
        traceback.print_exc()

def _handle_dhcp_packet_internal(pkt):
    if DHCP not in pkt:
        return

    msg_type = get_dhcp_option(pkt[DHCP].options, 'message-type')
    if not msg_type:
        return

    with lease_lock:
        leases = load_leases()
    # format MAC correctly
    client_mac = ':'.join(f'{b:02x}' for b in pkt[BOOTP].chaddr[:6])

    xid_hex = hex(pkt[BOOTP].xid)

    if msg_type == DHCP_MSG_DISCOVER:
        if pkt[BOOTP].giaddr == "0.0.0.0":
            return
        print(f"[*] Received DISCOVER from {client_mac} XID: {xid_hex}")
        post_event("DISCOVER_RECEIVED", pkt, {"xid": xid_hex})
        
        # Determine offered IP
        offered_ip = None
        if client_mac in leases:
            offered_ip = leases[client_mac]['ip']
        else:
            occupied = { entry["ip"] for entry in leases.values() }
            start = int(ipaddress.IPv4Address(config.IP_POOL_START))
            end = int(ipaddress.IPv4Address(config.IP_POOL_END))
            for ip_int in range(start, end + 1):
                ip_str = str(ipaddress.IPv4Address(ip_int))
                if ip_str not in occupied:
                    offered_ip = ip_str
                    break
            
        if offered_ip:
            offer_pkt = build_offer(pkt, offered_ip)
            print(f"[*] Sending OFFER to {client_mac}: {offered_ip}")
            sendp(offer_pkt, iface=config.IFACE, verbose=False)
            post_event("OFFER_SENT", offer_pkt, {"xid": xid_hex, "offered_ip": offered_ip})

    elif msg_type == DHCP_MSG_REQUEST:
        if pkt[BOOTP].giaddr == "0.0.0.0":
            return
        print(f"[*] Received REQUEST from {client_mac} XID: {xid_hex}")
        post_event("REQUEST_RECEIVED", pkt, {"xid": xid_hex})
        
        requested_ip = get_dhcp_option(pkt[DHCP].options, 'requested_addr')
        server_id = get_dhcp_option(pkt[DHCP].options, 'server_id')
        
        # If server_id is specified, and it's not us, ignore
        if server_id and server_id != config.SERVER_IP:
            return
            
        if requested_ip:
            # Check if IP is already occupied by a DIFFERENT mac address
            occupied_by_others = {
                m for m, entry in leases.items()
                if entry["ip"] == requested_ip and m != client_mac
            }
            if occupied_by_others:
                print(f"[*] DROP: Requested IP {requested_ip} is occupied by {occupied_by_others}")
                return
                
            # Update lease
            hostname = get_dhcp_option(pkt[DHCP].options, 'hostname')
            if hasattr(hostname, 'decode'):
                hostname = hostname.decode('utf-8', errors='ignore')
            elif not hostname:
                hostname = "-"
            
            from datetime import timezone, timedelta
            now = datetime.now(timezone.utc)
            expires_at = now + timedelta(seconds=config.LEASE_TIME)

            with lease_lock:
                leases[client_mac] = {
                    "ip": requested_ip,
                    "xid": xid_hex,
                    "hostname": hostname,
                    "assigned_at": now.isoformat(),
                    "expires_at": expires_at.isoformat()
                }
                save_leases(leases)
            
            ack_pkt = build_ack(pkt, requested_ip)
            print(f"[*] Sending ACK to {client_mac}: {requested_ip}")
            sendp(ack_pkt, iface=config.IFACE, verbose=False)
            post_event("ACK_SENT", ack_pkt, {"xid": xid_hex, "assigned_ip": requested_ip})

    elif msg_type == DHCP_MSG_RELEASE:
        raw_mac = ':'.join(f'{b:02x}' for b in pkt[BOOTP].chaddr[:6])
        print(f"[*] Received RELEASE from {raw_mac}")
        with lease_lock:
            # Normalize both sides to lowercase before comparing
            match_key = None
            for key in leases:
                if key.lower() == raw_mac.lower():
                    match_key = key
                    break
            if match_key:
                lease = leases[match_key]
                now_str = datetime.utcnow().isoformat() + "Z"
                append_to_history_nolock(match_key, lease['ip'], lease.get('assigned_at', ''), now_str, "RELEASED")
                del leases[match_key]
                save_leases(leases)
                print(f"[*] Released lease for MAC {match_key} IP {lease['ip']}")
            else:
                print(f"[*] RELEASE received but no lease found for {raw_mac}")

if __name__ == "__main__":
    print(f"[*] Starting DHCP Server on {config.IFACE} (IP Pool: {config.IP_POOL_START} - {config.IP_POOL_END})")
    # Listen on port 67 for incoming server requests
    import time
    while True:
        try:
            print("[*] Starting packet capture loop...")
            sniff(iface=config.IFACE, filter="udp and (port 67 or port 68)",
                  prn=handle_dhcp_packet, store=0)
            print("[!] sniff() returned unexpectedly, restarting in 2s...")
        except Exception as e:
            print(f"[!] sniff() crashed: {e}, restarting in 2s...")
        time.sleep(2)
