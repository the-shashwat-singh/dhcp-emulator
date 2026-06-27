#!/bin/bash
set -e

# Load environment variables from .env if present
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
fi

VM_USER=${VM_USER:-shashwat}
MAC_BACKEND_URL=${MAC_BACKEND_URL:-"http://10.0.2.2:8000/internal/event"}

echo "[*] Deploying to Server VM (192.168.128.10)..."
ssh vm-server "mkdir -p ~/dhcp-server/vm1_server ~/dhcp-server/shared"
# Dynamically replace MAC_BACKEND_URL for server config
sed "s|MAC_BACKEND_URL = .*|MAC_BACKEND_URL = \"$MAC_BACKEND_URL\"|g" vm1_server/config.py > /tmp/config_server.py
scp -r vm1_server/* vm-server:~/dhcp-server/vm1_server/
scp /tmp/config_server.py vm-server:~/dhcp-server/vm1_server/config.py
scp -r shared/* vm-server:~/dhcp-server/shared/
scp requirements.txt vm-server:~/dhcp-server/
ssh vm-server "pip3 install --user --break-system-packages -r ~/dhcp-server/requirements.txt || pip3 install -r ~/dhcp-server/requirements.txt"

echo "[*] Deploying to Relay VM (192.168.128.20)..."
ssh vm-agent "mkdir -p ~/dhcp-relay/vm3_relay ~/dhcp-relay/shared"
sed "s|MAC_BACKEND_URL = .*|MAC_BACKEND_URL = \"$MAC_BACKEND_URL\"|g" vm3_relay/config.py > /tmp/config_relay.py
scp -r vm3_relay/* vm-agent:~/dhcp-relay/vm3_relay/
scp /tmp/config_relay.py vm-agent:~/dhcp-relay/vm3_relay/config.py
scp -r shared/* vm-agent:~/dhcp-relay/shared/
scp requirements.txt vm-agent:~/dhcp-relay/
ssh vm-agent "pip3 install --user --break-system-packages -r ~/dhcp-relay/requirements.txt || pip3 install -r ~/dhcp-relay/requirements.txt"

echo "[*] Deploying to Client VM (192.168.128.50)..."
ssh vm-client "mkdir -p ~/dhcp-client/vm2_client ~/dhcp-client/shared"
sed "s|MAC_BACKEND_URL = .*|MAC_BACKEND_URL = \"$MAC_BACKEND_URL\"|g" vm2_client/config.py > /tmp/config_client.py
scp -r vm2_client/* vm-client:~/dhcp-client/vm2_client/
scp /tmp/config_client.py vm-client:~/dhcp-client/vm2_client/config.py
scp -r shared/* vm-client:~/dhcp-client/shared/
scp requirements.txt vm-client:~/dhcp-client/
ssh vm-client "pip3 install --user --break-system-packages -r ~/dhcp-client/requirements.txt || pip3 install -r ~/dhcp-client/requirements.txt"

echo "[*] Starting DHCP Server on Server VM..."
ssh vm-server "sudo pkill -f '[s]erver.py' || true"
ssh -f vm-server "sudo setsid /usr/bin/python3 -u /home/$VM_USER/dhcp-server/vm1_server/server.py < /dev/null > /tmp/server.log 2>&1 &"

echo "[*] Starting DHCP Relay on Relay VM..."
ssh vm-agent "sudo pkill -f '[r]elay.py' || true"
ssh -f vm-agent "sudo setsid /usr/bin/python3 -u /home/$VM_USER/dhcp-relay/vm3_relay/relay.py < /dev/null > /tmp/relay.log 2>&1 &"

echo "[*] Dependencies installed and servers started."
echo "[*] Starting Mac FastAPI backend..."
pkill -f 'mac_backend.main' || true
nohup python3 -m uvicorn mac_backend.main:app --host 0.0.0.0 --port 8000 > /tmp/mac_backend.log 2>&1 &
echo "[*] Mac Backend running on port 8000."

echo "[*] Checking React frontend..."
cd mac_frontend
if [ ! -d "node_modules" ]; then
    echo "[*] Installing frontend dependencies..."
    npm install
fi

echo "[*] Starting React Frontend in background..."
pkill -f 'vite' || true
nohup npm run dev > /tmp/mac_frontend.log 2>&1 &

echo "[*] DONE! Frontend is running on http://localhost:5173"
