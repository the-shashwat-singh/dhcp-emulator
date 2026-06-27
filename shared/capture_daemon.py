#!/usr/bin/env python3
import os
import sys
import signal

# Add local bin to path
os.environ["PATH"] += os.pathsep + "/home/shashwat/.local/bin"

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from scapy.all import sniff, wrpcap

import config

packets = []

def packet_handler(pkt):
    packets.append(pkt)
    print(f"[*] Captured packet: {len(packets)} total")

import datetime

def sig_handler(sig, frame):
    captures_dir = os.path.expanduser("~/dhcp-server/captures")
    os.makedirs(captures_dir, exist_ok=True)
    ts = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    filepath = os.path.join(captures_dir, f"capture_{ts}.pcap")
    print(f"[*] Stopping capture. Writing {len(packets)} packets to {filepath}")
    wrpcap(filepath, packets)
    sys.exit(0)

if __name__ == "__main__":
    signal.signal(signal.SIGINT, sig_handler)
    signal.signal(signal.SIGTERM, sig_handler)
    
    print(f"[*] Starting Scapy capture on {config.IFACE}...")
    sniff(iface=config.IFACE, filter="udp and (port 67 or port 68)", prn=packet_handler, store=0)
