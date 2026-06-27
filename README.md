# DHCP Protocol Emulator

A full-stack, distributed DHCP protocol emulator that visualizes the DORA (Discover, Offer, Request, Acknowledge) exchange in real-time. It consists of a React frontend, a FastAPI backend orchestrator, and three Linux VMs acting as the DHCP Server, Relay Agent, and Client.

## 🏗 Architecture

- **Mac Host**: Runs the React frontend and FastAPI backend orchestrator.
- **vm-server (192.168.128.10)**: Runs the Python DHCP Server (`vm1_server/server.py`).
- **vm-agent (192.168.128.20)**: Runs the DHCP Relay Agent (`vm3_relay/relay.py`), intercepting broadcasts and appending Option 82.
- **vm-client (192.168.128.50)**: Runs the DHCP Client (`vm2_client/client.py`), performing the DORA exchange on demand.

## 🌐 VM Network Configuration (VirtualBox / UTM)

To replicate this environment, create 3 Linux VMs (e.g., Ubuntu Server). They must be connected to a shared internal network so they can broadcast to each other, while still being accessible via SSH from the host.

### 1. Network Adapter Setup
For each VM, configure the primary network adapter (`enp0s1` or `eth0`):
- **VirtualBox**: Set Adapter 1 to **Host-Only Adapter** (e.g., `vboxnet0`) configured with the subnet `192.168.128.0/24`.
- **UTM**: Set the Network type to **Shared Network** or **Host-Only** with the subnet `192.168.128.0/24`.

*Note: The network interface name used in the scripts defaults to `enp0s1`. If your hypervisor uses `eth0` or `enp0s3`, you must update the `IFACE` variables in the `config.py` files.*

### 2. Static IP Assignment
Assign static IPs to the VMs on the Host-Only network. Edit `/etc/netplan/` (Ubuntu) or `/etc/network/interfaces` inside each VM:

- **Server VM**: `192.168.128.10`
- **Relay VM**: `192.168.128.20`
- **Client VM**: `192.168.128.50`

### 3. SSH Configuration
Ensure the host Mac can SSH into the VMs seamlessly without a password.
Add the following to your `~/.ssh/config`:
```ssh-config
Host vm-server
    HostName 192.168.128.10
    User <your-vm-username>
    IdentityFile ~/.ssh/id_rsa

Host vm-agent
    HostName 192.168.128.20
    User <your-vm-username>
    IdentityFile ~/.ssh/id_rsa

Host vm-client
    HostName 192.168.128.50
    User <your-vm-username>
    IdentityFile ~/.ssh/id_rsa
```
Make sure to generate an SSH key (`ssh-keygen`) and copy it to all VMs (`ssh-copy-id vm-server`, etc.).

### 4. Sudo Permissions
The emulator relies on raw sockets (Scapy) and network flushing, which requires root access. To prevent password prompts from breaking the automation, allow the VM user to run `sudo` without a password.
Inside each VM, run `sudo visudo` and append:
```
<your-vm-username> ALL=(ALL) NOPASSWD: ALL
```

## 🚀 Setup & Deployment

Once the VMs are provisioned, networking is configured, and SSH aliases are working, you can use the automated deployment script.

```bash
# Make the script executable
chmod +x deploy.sh

# Run the deployment
./deploy.sh
```

### What `deploy.sh` does:
1. `scp`'s the respective Python scripts to `vm-server`, `vm-agent`, and `vm-client`.
2. Installs `python3`, `pip3`, and `scapy` on all VMs.
3. Kills any existing background instances of the DHCP server and relay.
4. Safely starts `server.py` and `relay.py` in the background (detached from SSH via `ssh -f` and `setsid`).
5. Starts the FastAPI backend orchestrator (`uvicorn`) on port 8000.
6. Installs Node dependencies and starts the Vite frontend on port 5173.

## 🎮 Usage

1. Open your browser to `http://localhost:5173/dashboard`.
2. Click **Start Exchange** to trigger a DORA sequence.
    - The backend orchestrator connects to `vm-client` via SSH.
    - It drops the client's management IP (`ip addr flush`), enables promiscuous mode, and fires the Discover packet.
    - The Relay agent intercepts, adds Option 82, and unicasts to the Server.
    - Packets are streamed via WebSockets back to the React UI in real-time.
    - Finally, the backend restores the client's management IP (`192.168.128.50`) so SSH remains functional.
3. Click the **Release** button to dispatch a DHCP Release packet, which securely clears the lease on the server.

## 🛠 Troubleshooting

- **Server/Relay not capturing packets**: Verify the network interface is correct (`enp0s1`). You can tail the logs directly on the VMs: `ssh vm-server "tail -f /tmp/server.log"`
- **Client times out**: Ensure the client VM has promiscuous mode capabilities in the hypervisor settings. (VirtualBox: Network -> Advanced -> Promiscuous Mode: Allow All).
- **Backend fails to start client**: Ensure SSH keys are correctly set up and `sudo` requires no password on the `vm-client`.
