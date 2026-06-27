import json
import socket
from scapy.all import rdpcap, sendp, wrpcap, raw
from scapy.layers.l2 import Ether
from scapy.layers.inet import IP, UDP
from scapy.layers.dhcp import BOOTP, DHCP
from datetime import datetime
from shared.dhcp_constants import DHCP_MSG_TYPES

def format_mac(mac_bytes):
    if not mac_bytes:
        return ""
    mac_hex = mac_bytes[:6].hex()
    return ':'.join(mac_hex[i:i+2] for i in range(0, 12, 2))

def decode_option82(options):
    for opt in options:
        if isinstance(opt, tuple) and opt[0] == 82: # Standard code
            val = opt[1]
        elif isinstance(opt, tuple) and opt[0] == 'relay_agent_Information':
            val = opt[1]
        else:
            continue
            
        if not val:
            return None
            
        try:
            # val is bytes
            circuit_id_len = val[1]
            circuit_id = val[2:2+circuit_id_len].decode('ascii')
            
            offset = 2 + circuit_id_len
            remote_id_len = val[offset+1]
            remote_id_bytes = val[offset+2:offset+2+remote_id_len]
            remote_id = ':'.join(f'{b:02x}' for b in remote_id_bytes)
            
            return {
                "circuit_id": circuit_id,
                "remote_id": remote_id
            }
        except Exception as e:
            return {"raw_hex": val.hex()}
    return None

def decode_all_options(options):
    res = []
    for opt in options:
        if isinstance(opt, str):
            res.append({"code": "end", "name": "end", "value": ""})
        elif isinstance(opt, tuple):
            val = opt[1]
            if isinstance(val, bytes):
                try:
                    val = val.decode('utf-8')
                except:
                    val = val.hex()
            res.append({"code": opt[0], "name": str(opt[0]), "value": str(val)})
    return res

def parse_packet(pkt):
    if DHCP not in pkt:
        return None
        
    msg_type = "UNKNOWN"
    for opt in pkt[DHCP].options:
        if isinstance(opt, tuple) and opt[0] == 'message-type':
            msg_type = DHCP_MSG_TYPES.get(opt[1], "UNKNOWN")
            break

    try:
        cookie_bytes = raw(pkt[BOOTP])[236:240]
        magic_cookie = socket.inet_ntoa(cookie_bytes)
    except Exception:
        magic_cookie = "unknown"

    data = {
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "size_bytes": len(bytes(pkt)),
        "src_mac": pkt[Ether].src,
        "dst_mac": pkt[Ether].dst,
        "src_ip": pkt[IP].src,
        "dst_ip": pkt[IP].dst,
        "src_port": pkt[UDP].sport,
        "dst_port": pkt[UDP].dport,
        "dhcp_type": msg_type,
        "xid": hex(pkt[BOOTP].xid),
        "ciaddr": pkt[BOOTP].ciaddr,
        "yiaddr": pkt[BOOTP].yiaddr,
        "giaddr": pkt[BOOTP].giaddr,
        "chaddr": format_mac(pkt[BOOTP].chaddr),
        "hops": pkt[BOOTP].hops,
        "secs": pkt[BOOTP].secs,
        "flags": hex(int(pkt[BOOTP].flags)),
        "magic_cookie": magic_cookie,
        "options": decode_all_options(pkt[DHCP].options),
        "option82": decode_option82(pkt[DHCP].options)
    }
    return data

def save_pcap(packets, filename="captures/dhcp.pcap"):
    wrpcap(filename, packets)

def replay_pcap(filename, iface):
    packets = rdpcap(filename)
    sendp(packets, iface=iface, inter=0.1)
