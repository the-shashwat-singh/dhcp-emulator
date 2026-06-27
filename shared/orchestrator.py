import asyncio
import os
import sys

# Orchestrator doesn't execute much locally, it provides higher level state machine logic
# We integrate this directly into main.py for state management, 
# but provide a class here if needed.

class DHCPStateMachine:
    def __init__(self):
        self.state = "IDLE"
        self.client_ip = "0.0.0.0"
        self.last_xid = None
        self.leases = {}
        
    def transition(self, event, pkt, meta):
        if event == "DISCOVER_SENT":
            self.state = "DISCOVER"
            self.last_xid = meta.get("xid")
        elif event == "OFFER_SENT":
            self.state = "OFFER"
        elif event == "REQUEST_SENT":
            self.state = "REQUEST"
        elif event == "ACK_SENT":
            self.state = "ACK"
        elif event == "IP_ASSIGNED":
            self.state = "BOUND"
            self.client_ip = meta.get("assigned_ip")
            
        return self.state
