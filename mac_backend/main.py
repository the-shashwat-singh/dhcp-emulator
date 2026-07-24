import os
import sys
import json
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Any, Optional

from mac_backend.ws_manager import manager
from mac_backend.ssh_client import ssh_runner
from shared.orchestrator import DHCPStateMachine
import threading
from dotenv import load_dotenv
load_dotenv()

VM_USER = os.environ.get('VM_USER', 'shashwat')
SSH_KEY_PATH = os.environ.get('SSH_KEY_PATH', os.path.expanduser('~/.ssh/id_rsa'))
VM_SERVER_IP = os.environ.get('VM_SERVER_IP', '192.168.128.10')
VM_RELAY_IP = os.environ.get('VM_RELAY_IP', '192.168.128.20')
VM_CLIENT_IP = os.environ.get('VM_CLIENT_IP', '192.168.128.50')
VM_GATEWAY = os.environ.get('VM_GATEWAY', '192.168.128.1')


_event_lock = threading.Lock()
_event_seq = 0

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

state_machine = DHCPStateMachine()
all_packets = []

@app.get("/api/config")
async def get_config():
    return {
        "VM_SERVER_IP": VM_SERVER_IP,
        "VM_RELAY_IP": VM_RELAY_IP,
        "VM_CLIENT_IP": VM_CLIENT_IP,
        "VM_GATEWAY": VM_GATEWAY
    }

@app.get("/api/status")
async def get_status():
    return {
        "state": state_machine.state,
        "client_ip": state_machine.client_ip,
        "last_xid": state_machine.last_xid,
        "leases": state_machine.leases
    }

@app.post("/api/start")
async def start_dora():
    # Trigger client to start sniffing and send DISCOVER
    cmd = f"sudo setsid /usr/bin/python3 -u /home/{VM_USER}/dhcp-client/vm2_client/client.py > /tmp/dhcp_client.log 2>&1 &"
    res = await ssh_runner.execute_command("vm-client", cmd, background=True)
    return {"status": "started", "detail": res}

@app.post("/api/reset")
async def reset_dora():
    state_machine.state = "IDLE"
    state_machine.client_ip = "0.0.0.0"
    state_machine.last_xid = None
    all_packets.clear()
    
    # Kill existing processes
    kill_cmd = "sudo pkill -f '[c]lient.py' || true"
    await ssh_runner.execute_command("vm-client", kill_cmd)
    
    # Reset IP using the management SSH interface (must be done in background to survive flush)
    reset_ip_cmd = (
        "sudo setsid sh -c '"
        "ip addr flush dev enp0s1; "
        "sleep 1; "
        "ip addr add 192.168.128.50/24 dev enp0s1; "
        "ip link set enp0s1 up"
        "' > /tmp/reset.log 2>&1 &"
    )
    res = await ssh_runner.execute_command("vm-client", reset_ip_cmd, background=False)
    
    await manager.broadcast({"event": "RESET", "state": "IDLE"})
    return {"status": "reset", "detail": res}

@app.get("/api/leases")
async def get_leases():
    # Read leases.json from server VM
    cmd = f"cat /home/{VM_USER}/dhcp-server/vm1_server/leases.json"
    res = await ssh_runner.execute_command("vm-server", cmd)
    if "stdout" in res and res["stdout"]:
        try:
            leases = json.loads(res["stdout"])
            state_machine.leases = leases
            return leases
        except json.JSONDecodeError:
            return {}
    return {}

@app.post("/api/leases/release")
async def release_lease(body: dict):
    mac = body.get("mac")
    ip = body.get("ip")
    if ip:
        server_ip = "192.168.128.10"
        release_cmd = f"""sudo /usr/bin/python3 -c "
import random
from scapy.all import *
pkt = Ether(src='{mac}', dst='ff:ff:ff:ff:ff:ff') / IP(src='{ip}', dst='255.255.255.255') / UDP(sport=68, dport=67) / BOOTP(op=1, ciaddr='{ip}', chaddr=bytes.fromhex('{mac}'.replace(':','')), xid=random.randint(1, 0xFFFFFFFF)) / DHCP(options=[('message-type','release'),('server_id','{server_ip}'),'end'])
sendp(pkt, iface='enp0s1', verbose=False)
print('released')
"
"""
        await ssh_runner.execute_command("vm-client", release_cmd, background=True)

    await manager.broadcast({"event": "LEASE_RELEASED", "meta": {"mac": mac}})
    return {"status": "released", "mac": mac}

@app.post("/api/leases/renew")
async def renew_lease(body: dict):
    mac = body.get("mac")
    if not mac:
        return {"error": "Missing MAC address"}

    cmd = f"""sudo python3 -c '
import json, sys
from datetime import datetime, timedelta, timezone
file_path = "/home/{VM_USER}/dhcp-server/vm1_server/leases.json"
try:
    with open(file_path, "r") as f:
        leases = json.load(f)
    if "{mac}" in leases:
        new_time = (datetime.now(timezone.utc) + timedelta(seconds=86400)).isoformat()
        if "+00:00" not in new_time:
            new_time = new_time.replace("+00:00", "") + "+00:00"
        leases["{mac}"]["expires_at"] = new_time
        with open(file_path, "w") as f:
            json.dump(leases, f, indent=2)
        lease_info = leases["{mac}"]
        lease_info["mac"] = "{mac}"
        print(json.dumps(lease_info))
    else:
        sys.exit(1)
except Exception as e:
    sys.exit(1)
'"""
    res = await ssh_runner.execute_command("vm-server", cmd)
    if "stdout" in res and res["stdout"]:
        try:
            updated_lease = json.loads(res["stdout"].strip())
            await manager.broadcast({"event": "LEASE_RENEWED", "meta": {"mac": mac}})
            return {"status": "renewed", "lease": updated_lease}
        except Exception:
            pass
    return {"status": "error", "message": "Failed to renew lease"}

@app.get("/api/leases/history")
async def get_lease_history():
    cmd = f"cat /home/{VM_USER}/dhcp-server/vm1_server/lease_history.json"
    res = await ssh_runner.execute_command("vm-server", cmd)
    if "stdout" in res and res["stdout"]:
        try:
            return json.loads(res["stdout"])
        except json.JSONDecodeError:
            return []
    return []

@app.get("/api/pool/info")
async def get_pool_info():
    import ipaddress
    from shared import config
    try:
        s = int(ipaddress.IPv4Address(config.IP_POOL_START))
        e = int(ipaddress.IPv4Address(config.IP_POOL_END))
        pool_size = e - s + 1
    except:
        pool_size = 101
    return {"total_pool_size": pool_size}


@app.get("/api/packets")
async def get_packets():
    return all_packets

@app.post("/api/inject")
async def inject_packet(request: Request):
    payload = await request.json()
    msg_type = payload.get("message_type", "DISCOVER")
    mac = payload.get("client_mac", "82:f5:87:05:94:e9")
    xid = payload.get("xid", "0x12345678")
    req_ip = payload.get("requested_ip", "")
    server_id = payload.get("server_id", "")
    ciaddr = payload.get("ciaddr", "0.0.0.0")
    flags = payload.get("flags", "broadcast")
    hostname = payload.get("hostname", "")
    lease_time = payload.get("lease_time", "")
    prl = payload.get("param_req_list", [])

    flags_val = "0x8000" if flags == "broadcast" else "0x0000"
    dst_ip = "255.255.255.255"
    if flags != "broadcast" and server_id:
        # unicast if it's not broadcast and we know the server
        # but realistically clients broadcast DISCOVER/REQUEST initially
        pass

    opts = []
    msg_type_map = {
        "DISCOVER": 1, "OFFER": 2, "REQUEST": 3, 
        "DECLINE": 4, "ACK": 5, "NAK": 6, "RELEASE": 7, "INFORM": 8
    }
    msg_code = msg_type_map.get(msg_type.upper(), 1)
    
    opts.append(f"('message-type', {msg_code})")
    
    if req_ip:
        opts.append(f"('requested_addr', '{req_ip}')")
    if server_id:
        opts.append(f"('server_id', '{server_id}')")
    if hostname:
        opts.append(f"('hostname', b'{hostname}')")
    if lease_time:
        opts.append(f"('lease_time', {lease_time})")
    if prl:
        # scapy expects a byte list for param_req_list e.g. [1, 3, 6, ...]
        opts.append(f"('param_req_list', {prl})")
        
    opts.append("'end'")
    options_str = "[" + ", ".join(opts) + "]"

    script = f"""import json
import urllib.request
import os
from scapy.all import *

xid_str = hex({xid}) if isinstance({xid}, int) else str({xid})

def post_event(event_name, from_node, to_node, packet_dict, meta=None):
    if meta is None:
        meta = {{}}
    meta['injected'] = True
    meta['xid'] = xid_str
    
    data = {{
        "event": event_name,
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "from_node": from_node,
        "to_node": to_node,
        "packet": packet_dict,
        "meta": meta
    }}
    try:
        req = urllib.request.Request('http://10.0.2.2:8000/internal/event', data=json.dumps(data).encode('utf-8'), headers={{'Content-Type': 'application/json'}})
        urllib.request.urlopen(req, timeout=2)
    except Exception as e:
        pass

mac = '{mac}'
chaddr_bytes = bytes.fromhex(mac.replace(':',''))
chaddr_bytes = chaddr_bytes + b'\\x00' * (16 - len(chaddr_bytes))

pkt = (
    Ether(src=mac, dst='ff:ff:ff:ff:ff:ff') /
    IP(src='{ciaddr}', dst='255.255.255.255') /
    UDP(sport=68, dport=67) /
    BOOTP(op=1, chaddr=chaddr_bytes, xid={xid}, ciaddr='{ciaddr}', flags={flags_val}) /
    DHCP(options={options_str})
)

init_packet_info = {{
    "xid": xid_str,
    "dhcp_type": "{msg_type.upper()}",
    "src_mac": mac,
    "dst_mac": "ff:ff:ff:ff:ff:ff",
    "src_ip": "{ciaddr}",
    "dst_ip": "255.255.255.255",
    "src_port": 68,
    "dst_port": 67,
    "op": 1,
    "hops": 0,
    "ciaddr": "{ciaddr}",
    "yiaddr": "0.0.0.0",
    "giaddr": "0.0.0.0",
    "chaddr": mac,
    "size": len(pkt),
    "flags": "0x8000",
    "magic_cookie": "99.130.83.99",
    "options": [{{"name": "message-type", "value": 1}}, {{"name": "hostname", "value": "dhcp-client"}}]
}}

if "{msg_type.upper()}" == "DISCOVER":
    def is_offer(p):
        return DHCP in p and BOOTP in p and p[BOOTP].xid == {xid} and p[DHCP].options[0][1] == 2
    
    # 1. Start sniffer FIRST
    offer_sniffer = AsyncSniffer(iface='enp0s1', lfilter=is_offer, count=1, promisc=True)
    offer_sniffer.start()
    
    # 2. Send DISCOVER
    sendp(pkt, iface='enp0s1', verbose=False)
    
    post_event("DISCOVER_SENT", "client", "relay", init_packet_info)
    
    # 4. Wait for OFFER
    offer_sniffer.join(timeout=8)
    offers = offer_sniffer.results
    
    if offers:
        offer = offers[0]
        yiaddr = offer[BOOTP].yiaddr
        server_id = None
        for opt in offer[DHCP].options:
            if isinstance(opt, tuple) and opt[0] == 'server_id':
                server_id = opt[1]
                break
        
        if server_id and yiaddr:
            req_pkt = (
                Ether(src=mac, dst="ff:ff:ff:ff:ff:ff") /
                IP(src="0.0.0.0", dst="255.255.255.255") /
                UDP(sport=68, dport=67) /
                BOOTP(op=1, chaddr=chaddr_bytes, xid={xid}, flags={flags_val}) /
                DHCP(options=[
                    ("message-type", 3),
                    ("requested_addr", yiaddr),
                    ("server_id", server_id),
                    ("hostname", b"{hostname}" if "{hostname}" else b"test-client"),
                    "end"
                ])
            )
            
            def is_ack(p):
                return DHCP in p and BOOTP in p and p[BOOTP].xid == {xid} and p[DHCP].options[0][1] == 5
            
            # 1. Start sniffer FIRST
            ack_sniffer = AsyncSniffer(iface='enp0s1', lfilter=is_ack, count=1, promisc=True)
            ack_sniffer.start()
            
            # 2. Send REQUEST
            sendp(req_pkt, iface='enp0s1', verbose=False)
            
            req_packet_info = {{
                "xid": xid_str,
                "dhcp_type": "REQUEST",
                "src_mac": mac,
                "dst_mac": "ff:ff:ff:ff:ff:ff",
                "src_ip": "0.0.0.0",
                "dst_ip": "255.255.255.255",
                "src_port": 68,
                "dst_port": 67,
                "op": 1,
                "hops": 0,
                "ciaddr": "0.0.0.0",
                "yiaddr": "0.0.0.0",
                "giaddr": "0.0.0.0",
                "chaddr": mac,
                "size": len(req_pkt),
                "flags": "0x8000",
                "magic_cookie": "99.130.83.99",
                "options": [{{"name": "message-type", "value": 3}}, {{"name": "requested_addr", "value": yiaddr}}, {{"name": "server_id", "value": server_id}}, {{"name": "hostname", "value": "{hostname}" if "{hostname}" else "test-client"}}]
            }}
            post_event("REQUEST_SENT", "client", "relay", req_packet_info)
            
            # 4. Wait for ACK
            ack_sniffer.join(timeout=8)
            acks = ack_sniffer.results
            
            if acks:
                ack = acks[0]
                
                if mac == "82:f5:87:05:94:e9":
                    os.system(f"ip addr add {{yiaddr}}/24 dev enp0s1")
                
                post_event("IP_ASSIGNED", "client", "client", {{
                    "xid": xid_str,
                    "dhcp_type": "IP",
                    "src_mac": mac,
                    "dst_mac": mac,
                    "src_ip": yiaddr,
                    "dst_ip": yiaddr,
                    "src_port": 68,
                    "dst_port": 68,
                    "op": 0,
                    "hops": 0,
                    "ciaddr": yiaddr,
                    "yiaddr": yiaddr,
                    "giaddr": "0.0.0.0",
                    "chaddr": mac,
                    "size": len(pkt),
                    "assigned_ip": yiaddr,
                    "options": []
                }}, meta={{"assigned_ip": yiaddr, "mac": mac}})
else:
    sendp(pkt, iface='enp0s1', verbose=False)
"""
    import base64
    b64_script = base64.b64encode(script.encode('utf-8')).decode('utf-8')
    cmd = f"echo '{b64_script}' | base64 -d > /tmp/inject.py && sudo /usr/bin/python3 /tmp/inject.py"
    res = await ssh_runner.execute_command("vm-client", cmd, background=False)
    return {"status": "injected", "detail": res}

class PoolConfig(BaseModel):
    start_ip: str
    end_ip: str

@app.post("/api/config/pool")
async def update_pool(config: PoolConfig):
    pool_data = {"START_IP": config.start_ip, "END_IP": config.end_ip}
    pool_json = json.dumps(pool_data)
    # Write to pool.json on server and restart
    cmd = (
        f"sh -c \"echo '{pool_json}' > /home/{VM_USER}/dhcp-server/vm1_server/pool.json\""
    )
    res = await ssh_runner.execute_command("vm-server", cmd, background=False)
    return {"status": "pool_updated", "detail": res}

@app.post("/api/capture/start")
async def start_capture():
    cmd = f"cd /home/{VM_USER}/dhcp-server/vm1_server && sudo nohup /usr/bin/python3 ../shared/capture_daemon.py > /tmp/capture.log 2>&1 &"
    res = await ssh_runner.execute_command("vm-server", cmd, background=False)
    return {"status": "started"}

@app.post("/api/capture/stop")
async def stop_capture():
    cmd = "sudo pkill -f capture_daemon.py || true"
    await ssh_runner.execute_command("vm-server", cmd)
    os.makedirs("captures", exist_ok=True)
    subprocess.run(["scp", "-o", "StrictHostKeyChecking=no", "-i", os.path.expanduser(SSH_KEY_PATH), "-r", f"{VM_USER}@{VM_SERVER_IP}:/home/{VM_USER}/dhcp-server/captures/", "./"], check=False)
    return {"status": "stopped"}

@app.get("/api/captures")
async def list_captures():
    os.makedirs("captures", exist_ok=True)
    files = [f for f in os.listdir("captures") if f.endswith(".pcap")]
    results = []
    for f in files:
        path = os.path.join("captures", f)
        try:
            from scapy.all import rdpcap
            p = rdpcap(path)
            count = len(p)
        except Exception:
            count = 0
        stat = os.stat(path)
        time_str = datetime.datetime.fromtimestamp(stat.st_mtime).strftime("%Y-%m-%d %H:%M:%S")
        results.append({"filename": f, "packets": count, "time": time_str})
    return sorted(results, key=lambda x: x["time"], reverse=True)

from fastapi.responses import FileResponse, Response
import subprocess
import datetime

def format_dora_report(pkts_data, final_ip):
    events_order = [
        ("DISCOVER", "DISCOVER_SENT"),
        ("RELAY INSERTS OPTION 82", "OPTION82_INSERTED"),
        ("OFFER", "OFFER_SENT"),
        ("REQUEST", "REQUEST_SENT"),
        ("RELAY INSERTS OPTION 82 (REQUEST)", "OPTION82_INSERTED"),
        ("ACK", "ACK_SENT")
    ]
    
    filtered = []
    seen = set()
    xid = ""
    for eo, ev_name in events_order:
        for p in pkts_data:
            if p["event"] == ev_name and ev_name not in seen:
                if ev_name == "OPTION82_INSERTED":
                    msg_type = next((opt["value"] for opt in p["packet"]["options"] if opt["name"] == "message-type"), "")
                    if "DISCOVER" in eo and msg_type != "1": continue
                    if "REQUEST" in eo and msg_type != "3": continue
                
                filtered.append((eo, p))
                seen.add(ev_name)
                if ev_name == "OPTION82_INSERTED" and "DISCOVER" in eo:
                    seen.remove(ev_name)
                    eo = "DISCOVER"
                
                if not xid: xid = p["packet"].get("xid", "")
                break

    lines = []
    now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    lines.append("═══════════════════════════════════════════════")
    lines.append("DHCP DORA EXCHANGE REPORT")
    lines.append(f"Date: {now}")
    lines.append(f"XID: {xid}")
    lines.append(f"Final Assigned IP: {final_ip}")
    lines.append("═══════════════════════════════════════════════")
    
    step_num = 1
    for step_title, data in filtered:
        lines.append("")
        title = f"STEP {step_num-1}b: {step_title}" if "RELAY" in step_title else f"STEP {step_num}: {step_title}"
        if "RELAY" not in step_title: step_num += 1
            
        lines.append(f"── {title} ".ljust(47, "─"))
        
        pkt = data["packet"]
        try:
            t = datetime.datetime.strptime(pkt["timestamp"], "%Y-%m-%dT%H:%M:%S.%fZ")
            time_str = t.strftime("%H:%M:%S.%f")[:-3]
        except:
            time_str = pkt["timestamp"]
            
        from_node = data["from_node"].upper()
        to_node = data["to_node"].upper()
        if "broadcast" in to_node.lower() or to_node == "BROADCAST":
            to_node = "BROADCAST (ff:ff:ff:ff:ff:ff)"
        elif to_node == "SERVER": to_node = f"SERVER ({pkt['dst_ip']})"
        elif to_node == "CLIENT": to_node = f"CLIENT ({pkt['dst_mac']})"
            
        if from_node == "CLIENT": from_node = f"CLIENT ({pkt['src_mac']})"
        elif from_node == "RELAY": from_node = f"RELAY ({pkt['src_ip']})"
        elif from_node == "SERVER": from_node = f"SERVER ({pkt['src_ip']})"
            
        lines.append(f"Time:      {time_str}")
        lines.append(f"From:      {from_node}")
        lines.append(f"To:        {to_node}")
        lines.append(f"Size:      {pkt['size_bytes']} bytes")
        lines.append("")
        lines.append(f"Ethernet:  {pkt['src_mac']} → {pkt['dst_mac']}")
        lines.append(f"IP:        {pkt['src_ip']} → {pkt['dst_ip']}")
        lines.append(f"UDP:       {pkt['src_port']} → {pkt['dst_port']}")
        
        op = "1" if pkt['dhcp_type'] in ["DISCOVER", "REQUEST"] else "2"
        lines.append(f"BOOTP:     op={op}, hops={pkt['hops']}, xid={pkt['xid']}")
        
        if "RELAY" in step_title:
            lines.append(f"           giaddr={pkt['giaddr']}")
            opt82 = next((o for o in pkt["options"] if o["code"] == 82 or o["name"] == "relay_agent_Information"), None)
            if opt82:
                val = opt82["value"]
                try:
                    b = bytes.fromhex(val)
                    idx, c_id, r_id = 0, "", ""
                    while idx < len(b):
                        subopt, length = b[idx], b[idx+1]
                        data = b[idx+2:idx+2+length]
                        if subopt == 1: c_id = data.decode('ascii', errors='ignore')
                        elif subopt == 2: r_id = ":".join(f"{x:02x}" for x in data)
                        idx += 2 + length
                    if c_id and r_id:
                        lines.append(f"Option 82: circuit_id={c_id}\n           remote_id={r_id}")
                    else: lines.append(f"Option 82: {val}")
                except Exception: lines.append(f"Option 82: {val}")
        else:
            lines.append(f"           ciaddr={pkt['ciaddr']}, yiaddr={pkt['yiaddr']}")
            lines.append(f"           giaddr={pkt['giaddr']}, chaddr={pkt['chaddr']}")
            if not pkt["options"]: lines.append("DHCP Opts: none")
            else:
                lines.append(f"DHCP Opts: {pkt['options'][0]['name']}={pkt['options'][0]['value']}")
                for opt in pkt["options"][1:]:
                    if opt["name"] == "end": continue
                    lines.append(f"           {opt['name']}={opt['value']}")
    
    lines.append("")
    lines.append("═══════════════════════════════════════════════")
    lines.append(f"RESULT: IP {final_ip} ASSIGNED ✓")
    lines.append("Subnet: 255.255.255.0")
    lines.append(f"Gateway: {VM_GATEWAY}")
    lines.append("DNS: 8.8.8.8")
    lines.append("Lease: 86400 seconds (24 hours)")
    lines.append("═══════════════════════════════════════════════")
    return "\n".join(lines)

@app.get("/api/export-logs")
async def export_logs():
    if not all_packets:
        content = "[]"
    else:
        content = json.dumps(all_packets, indent=2)
    filename = f"dhcp_events_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    return Response(
        content=content,
        media_type="application/json",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@app.post("/api/clear-buffer")
async def clear_buffer():
    all_packets.clear()
    return {"status": "cleared"}


@app.get("/api/captures/download")
async def download_capture(filename: str = ""):
    if not filename:
        return {"error": "No filename provided"}
    
    filepath = os.path.join("captures", os.path.basename(filename))
    if os.path.exists(filepath):
        return FileResponse(path=filepath, filename=filename, media_type="application/vnd.tcpdump.pcap")
    return {"error": "Capture file not found"}

import time

# Dictionary to track recently broadcasted events for deduplication
# Key: (base_event, xid, from_node, to_node), Value: timestamp
recent_broadcasts = {}

@app.post("/internal/event")
async def receive_event(request: Request):
    data = await request.json()
    from datetime import datetime, timezone, timedelta
    IST = timezone(timedelta(hours=5, minutes=30))
    data["display_time"] = datetime.now(IST).isoformat()
    print(f"DEBUG EVENT: {data}", flush=True)
    
    event_name = data.get("event")
    pkt = data.get("packet")
    meta = data.get("meta", {})
    
    VALID_DHCP_TYPES = {
        "DISCOVER", "OFFER", "REQUEST", "ACK", 
        "RELEASE", "INFORM", "NAK", "DECLINE",
        "OPTION82_INSERTED", "OPTION82"
    }
    
    dhcp_type = data.get("dhcp_type") or event_name.replace("_SENT", "").replace("_RECEIVED", "").replace("_INSERTED", "")
    
    if dhcp_type not in VALID_DHCP_TYPES:
        return {"status": "ignored"}
        
    global _event_seq
    with _event_lock:
        data["seq"] = _event_seq
        _event_seq += 1
    
    # Deduplication check
    base_event = event_name.split("_")[0] if event_name else ""
    xid = meta.get("xid", "")
    from_node = data.get("from_node", "")
    to_node = data.get("to_node", "")
    dhcp_type = pkt.get("dhcp_type", "") if pkt else ""
    
    dedupe_key = (base_event, xid, from_node, to_node, dhcp_type)
    current_time = time.time()
    
    if dedupe_key in recent_broadcasts:
        last_seen = recent_broadcasts[dedupe_key]
        if current_time - last_seen < 2.0:
            # Duplicate within short time window, drop it
            return {"status": "dropped_duplicate"}
            
    recent_broadcasts[dedupe_key] = current_time
    
    # Store packet
    if pkt:
        all_packets.append(data)
    
    # Update State Machine
    state_machine.transition(event_name, pkt, meta)
    
    # Inject current global state into the broadcast
    data["current_state"] = state_machine.state
    data["client_ip"] = state_machine.client_ip
    
    # Broadcast to React frontend
    await manager.broadcast(data)
    
    return {"status": "ok"}

@app.websocket("/ws/events")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            # Handle incoming commands from UI if any
    except WebSocketDisconnect:
        manager.disconnect(websocket)
