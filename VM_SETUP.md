# VM Setup Guide

This guide walks you through creating and configuring the 3 Ubuntu VMs required to run DHCP.EMU from scratch.

> **If you're rebuilding:** The `docs/vm-configs/` folder contains the exact working network config files from a verified setup. Copy them in at Step 3 instead of writing them manually.

---

## Overview

| VM | Role | Host-Only IP | SSH Alias |
|---|---|---|---|
| VM1 | DHCP Server | 192.168.128.10 | vm-server |
| VM2 | DHCP Client | 192.168.128.50 | vm-client |
| VM3 | Relay Agent | 192.168.128.20 | vm-agent |

Each VM has **two network adapters:**
- `enp0s1` — Host-Only → static IP, used for all DHCP traffic between VMs
- `enp0s2` — NAT (internet) → used for SSH from Mac, package installs, and posting events to the Mac backend

SSH always goes through `enp0s1` (Host-Only). The `enp0s2` NAT adapter is only used inside the VMs for outbound internet and for POSTing events to `10.0.2.2:8000`.

---

## Step 1 — Prerequisites

- UTM installed on Mac (Apple Silicon)
- Ubuntu Server 22.04 LTS ISO downloaded from ubuntu.com
- At least 30GB free disk space total (10GB per VM)

---

## Step 2 — Create 3 VMs in UTM

Do this for each VM. Settings are identical for all three.

1. Open UTM → **+** → **Virtualize** → **Linux**
2. Point to Ubuntu Server 22.04 ISO
3. RAM: **2GB**, CPU: **2 cores**, Disk: **8GB** (do not use the default 20GB+ — it wastes space)
4. In VM settings → **Network**, set the existing adapter to **Host Only**
5. Click **New** → **Network** → set to **Emulated VLAN** (this is UTM's NAT with internet — do NOT use "Shared Network", it doesn't work correctly)
6. Save

Name the VMs: `dhcp-server`, `dhcp-client`, `dhcp-relay`

---

## Step 3 — Install Ubuntu on Each VM

> **Username note:** This guide uses `ubuntu` as the default username — it's what Ubuntu Server creates by default and the easiest choice. If you pick a different username during install, replace every instance of `ubuntu` in this guide with yours, and update `VM_USER` in your `.env` file.

Boot each VM from the ISO and follow the installer:

- Hostname: `dhcp-server` / `dhcp-client` / `dhcp-relay`
- Username: `ubuntu` (recommended — see note above)
- **Enable OpenSSH server** during install (required)
- No extra packages needed

After install, find the current IP of `enp0s1` on each VM (needed for initial SSH):
```bash
ip addr show
# look for inet line on enp0s1 — UTM assigns a temporary IP initially
```

---

## Step 4 — Set Static IPs Using systemd-networkd

> **Shortcut:** copy the files from `docs/vm-configs/` directly instead of writing them manually.

Do NOT use netplan for this — NetworkManager and netplan fight each other in this setup. Use systemd-networkd config files directly.

**On each VM, disable NetworkManager first:**
```bash
sudo systemctl stop NetworkManager
sudo systemctl disable NetworkManager
sudo systemctl mask NetworkManager
sudo systemctl enable systemd-networkd
```

**VM1 (dhcp-server) — create `/etc/systemd/network/10-enp0s1.network`:**
```ini
[Match]
Name=enp0s1

[Network]
Address=192.168.128.10/24
```

**VM2 (dhcp-client) — create `/etc/systemd/network/10-enp0s1.network`:**
```ini
[Match]
Name=enp0s1

[Network]
Address=192.168.128.50/24
```

**VM3 (dhcp-relay) — create `/etc/systemd/network/10-enp0s1.network`:**
```ini
[Match]
Name=enp0s1

[Network]
Address=192.168.128.20/24
```

**All 3 VMs — create `/etc/systemd/network/20-enp0s2.network`:**
```ini
[Match]
Name=enp0s2

[Network]
DHCP=yes
```

Then apply on each VM:
```bash
sudo systemctl restart systemd-networkd
sudo reboot
```

After reboot verify:
```bash
ip addr show enp0s1 | grep inet
# vm-server should show 192.168.128.10
# vm-client should show 192.168.128.50
# vm-agent  should show 192.168.128.20
```

---

## Step 5 — Passwordless Sudo

On each VM run:
```bash
echo 'ubuntu ALL=(ALL) NOPASSWD:ALL' | sudo tee /etc/sudoers.d/ubuntu
```

Do NOT use `sudo visudo` for this — it's error-prone over SSH. The `tee` method is reliable.

---

## Step 6 — SSH Key Setup (on your Mac)

```bash
# Generate key if you don't have one
ls ~/.ssh/id_rsa.pub || ssh-keygen -t rsa -b 4096 -N "" -f ~/.ssh/id_rsa

# Copy key to each VM — use the current enp0s1 IP shown after reboot
ssh-copy-id ubuntu@192.168.128.10   # vm-server
ssh-copy-id ubuntu@192.168.128.20   # vm-agent
ssh-copy-id ubuntu@192.168.128.50   # vm-client
```

Add to `~/.ssh/config` on your Mac:
```
Host vm-server
    HostName 192.168.128.10
    User ubuntu
    IdentityFile ~/.ssh/id_rsa

Host vm-agent
    HostName 192.168.128.20
    User ubuntu
    IdentityFile ~/.ssh/id_rsa

Host vm-client
    HostName 192.168.128.50
    User ubuntu
    IdentityFile ~/.ssh/id_rsa
```

Test:
```bash
ssh vm-server "echo ok"
ssh vm-agent  "echo ok"
ssh vm-client "echo ok"
```

---

## Step 7 — Enable IP Forwarding on Relay Agent

```bash
ssh vm-agent "sudo sysctl -w net.ipv4.ip_forward=1 && echo 'net.ipv4.ip_forward=1' | sudo tee -a /etc/sysctl.conf"
```

---

## Step 8 — Install Dependencies

```bash
for vm in vm-server vm-agent vm-client; do
  ssh $vm "sudo apt update -q && \
           sudo apt install -y python3-pip tcpdump net-tools && \
           pip3 install scapy fastapi uvicorn websockets \
                        paramiko requests --break-system-packages"
done
```

Verify scapy version is 2.5.x:
```bash
ssh vm-server "python3 -c 'import scapy; print(scapy.__version__)'"
```

---

## Step 9 — Deploy and Run

```bash
# From project root on Mac
chmod +x deploy.sh
./deploy.sh

# Start backend
pkill -f 'uvicorn mac_backend' || true
nohup python3 -m uvicorn mac_backend.main:app \
  --host 0.0.0.0 --port 8000 > /tmp/mac_backend.log 2>&1 &

# Start frontend
cd mac_frontend && npm install && npm run dev
```

Open `http://localhost:5173`

---

## Step 10 — Verify Everything Works

```bash
# All VMs reachable
ssh vm-server "echo ok" && ssh vm-agent "echo ok" && ssh vm-client "echo ok"

# Passwordless sudo works
ssh vm-server "sudo whoami"   # should print: root

# VMs can reach each other
ssh vm-server "ping -c 2 192.168.128.20 && ping -c 2 192.168.128.50"

# VMs can reach Mac backend via NAT
ssh vm-server "curl -s -o /dev/null -w '%{http_code}' \
  http://10.0.2.2:8000/internal/event \
  -X POST -H 'Content-Type: application/json' \
  -d '{\"event\":\"TEST\"}'"
# Should return 200 or 422 (both mean backend is reachable)

# No rogue DHCP server on Mac (critical)
sudo lsof -iUDP:67 -n -P   # must return EMPTY
# If not empty: System Settings → Sharing → Internet Sharing → OFF → reboot Mac
```

---

## Common Issues

| Symptom | Cause | Fix |
|---|---|---|
| SSH timeout after static IP set | Old IP cached in `~/.ssh/known_hosts` | `ssh-keygen -R <old-ip>` then reconnect |
| Secondary IPs still showing after reboot | NetworkManager fighting systemd-networkd | Make sure NetworkManager is masked (Step 4) |
| `enp0s1`/`enp0s2` names differ | Hypervisor assigned different names | Check with `ip link show` inside VM, update config files and `.env` |
| Scapy permission denied | Raw socket needs root | All scripts run with `sudo` via deploy.sh |
| Events not showing in dashboard | Wrong backend URL from VM | Must be `10.0.2.2:8000` via enp0s2, not the Host-Only IP |
| Wrong IP assigned / scrambled DORA | Rogue macOS `bootpd` responding | Run `sudo lsof -iUDP:67` — if not empty, turn off Internet Sharing and reboot Mac |
| Client VM unreachable after exchange | `ip addr flush enp0s1` killed SSH | Client script daemonizes before flush — if broken, go to UTM console and run `sudo ip addr add 192.168.128.50/24 dev enp0s1` |
