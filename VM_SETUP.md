# VM Setup Guide

This guide walks you through creating and configuring the 3 Ubuntu VMs required to run DHCP.EMU from scratch.

## Prerequisites
- UTM (Mac) or VirtualBox (Windows/Linux/Mac)
- Ubuntu Server 22.04 ISO
- At least 4GB RAM and 20GB disk space available

## Overview
You will create 3 VMs:
| VM | Role | Host-Only IP | SSH Alias |
|---|---|---|---|
| VM1 | DHCP Server | 192.168.128.10 | vm-server |
| VM2 | DHCP Client | 192.168.128.50 | vm-client |
| VM3 | Relay Agent | 192.168.128.20 | vm-agent |

> ⚠️ **IMPORTANT**: During a DHCP exchange, `enp0s1` (the Host-Only adapter) gets its IP temporarily flushed and reassigned. This is by design. SSH connections must always go through `enp0s2` (the NAT adapter) to survive the exchange. The deploy script handles this automatically.

## Section 1 — Creating VMs in UTM
- Download Ubuntu Server 22.04 ISO
- Create new VM in UTM, select Linux, allocate 1GB RAM, 10GB disk
- Add TWO network adapters:
  - Adapter 1: Host Only — becomes `enp0s1`, used for DHCP traffic and static IP
  - Adapter 2: Shared Network (NAT) — becomes `enp0s2`, used for SSH and internet
- Repeat for all 3 VMs
- *Note: do this for VirtualBox too as an alternative with equivalent steps*

## Section 2 — Installing Ubuntu
- Boot from ISO, follow installer
- Set hostnames: `dhcp-server`, `dhcp-client`, `dhcp-relay`
- Create user `shashwat` (or whatever `VM_USER` is set to in `.env`)
- Install OpenSSH server during setup

## Section 3 — Static IP Configuration
For each VM, configure the Host-Only adapter with a static IP using netplan. Write the exact netplan YAML for each VM:

**VM1 (`/etc/netplan/00-installer-config.yaml`):**
```yaml
network:
  version: 2
  ethernets:
    enp0s1:
      addresses: [192.168.128.10/24]  # static, DHCP traffic
      nameservers:
        addresses: [8.8.8.8]
    enp0s2:
      dhcp4: true  # NAT, SSH management
```
Same pattern for VM2 (192.168.128.50) and VM3 (192.168.128.20). Then run `sudo netplan apply`.

## Section 4 — Passwordless sudo
On each VM run:
```bash
sudo visudo
```
Add at the bottom:
```
your_username ALL=(ALL) NOPASSWD: ALL
```

## Section 5 — SSH Key Setup (on your Mac)
```bash
# Generate key if you don't have one
ssh-keygen -t rsa -b 4096

# Copy to each VM (you'll need VM's NAT IP for this)
# Find NAT IP inside each VM with: ip addr show enp0s2
ssh-copy-id username@<VM_NAT_IP>

# Add aliases to ~/.ssh/config
```

Write the exact `~/.ssh/config` block:
```
Host vm-server
    HostName 192.168.128.10
    User your_username
    IdentityFile ~/.ssh/id_rsa

Host vm-client
    HostName 192.168.128.50
    User your_username
    IdentityFile ~/.ssh/id_rsa

Host vm-agent
    HostName 192.168.128.20
    User your_username
    IdentityFile ~/.ssh/id_rsa
```

*Note: SSH aliases use the Host-Only IP on enp0s1. The NAT adapter enp0s2 is used for internet access and initial SSH key copying using the VM's DHCP-assigned NAT IP.*

## Section 6 — Promiscuous Mode
- **UTM**: In VM settings → Network → check "Allow promiscuous mode"  
- **VirtualBox**: VM Settings → Network → Adapter 1 → Advanced → Promiscuous Mode → Allow All

## Section 7 — Install Python dependencies on each VM
```bash
sudo apt update
sudo apt install python3 python3-pip -y
pip3 install scapy==2.5.0 requests --break-system-packages
```

## Section 8 — Verify everything works
```bash
# From your Mac, test SSH to all 3 VMs
ssh vm-server "echo 'VM1 OK'"
ssh vm-client "echo 'VM2 OK'"
ssh vm-agent "echo 'VM3 OK'"

# Test passwordless sudo
ssh vm-server "sudo whoami"  # should print: root

# Test network connectivity between VMs
ssh vm-server "ping -c 3 192.168.128.50"  # server can reach client
ssh vm-server "ping -c 3 192.168.128.20"  # server can reach relay

# Verify MAC_BACKEND_URL is reachable from VMs
# The Mac backend must be reachable at 10.0.2.2:8000 from the VMs via enp0s2
ssh vm-server "curl -s -o /dev/null -w '%{http_code}' http://10.0.2.2:8000/internal/event -X POST -H 'Content-Type: application/json' -d '{\"event\":\"TEST\"}'"
# Should return 200
```

If all commands succeed, run `./deploy.sh` from the project root.

## Section 9 — Common Issues
- **SSH timeout**: VM might be using wrong adapter for SSH — check `ip addr` inside VM and verify Host-Only adapter has the static IP
- **Scapy permission denied**: Make sure passwordless sudo is configured
- **Packets not received**: Enable promiscuous mode in hypervisor settings
- **Backend can't reach VMs**: Check SSH config aliases and key path in `.env`
- **Events not appearing in dashboard**: The `MAC_BACKEND_URL` in `.env` must match your hypervisor's NAT gateway. UTM uses `10.0.2.2`, VirtualBox also uses `10.0.2.2`. Verify with: `ssh vm-server "ip route show"` and look for the default gateway.
- **enp0s1/enp0s2 names may differ**: Some hypervisors assign `eth0`/`eth1` instead. Check with `ip addr` inside the VM and update `DHCP_IFACE` in `.env` accordingly.
