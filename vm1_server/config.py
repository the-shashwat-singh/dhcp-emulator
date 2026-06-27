# Server Configuration
import os
import sys

# Support running locally or on VM
IFACE = "enp0s1"
SUBNET = "192.168.128.0"
NETMASK = "255.255.255.0"
IP_POOL_START = "192.168.128.100"
IP_POOL_END = "192.168.128.200"
GATEWAY = "192.168.128.1"
DNS_SERVERS = ["8.8.8.8", "8.8.4.4"]
BROADCAST = "192.168.128.255"

LEASE_TIME = 86400      # 24 hours
RENEWAL_TIME = 43200    # 12 hours
REBINDING_TIME = 75600  # 21 hours

SERVER_IP = "192.168.128.10"
MAC_BACKEND_URL = "http://10.0.2.2:8000/internal/event"

LEASES_FILE = "leases.json"
