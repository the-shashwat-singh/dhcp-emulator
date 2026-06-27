import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

export default function DocumentationPanel({ isOpen, onClose }) {
  const [config, setConfig] = useState({
    VM_SERVER_IP: '192.168.128.10',
    VM_RELAY_IP: '192.168.128.20',
    VM_CLIENT_IP: '192.168.128.50',
    VM_GATEWAY: '192.168.128.1'
  });
  
  const [pool, setPool] = useState({
    start_ip: '192.168.128.100',
    end_ip: '192.168.128.200'
  });

  useEffect(() => {
    if (isOpen) {
      fetch('http://localhost:8000/api/config')
        .then(res => res.json())
        .then(data => setConfig(prev => ({ ...prev, ...data })))
        .catch(console.error);
        
      fetch('http://localhost:8000/api/pool/info')
        .then(res => res.json())
        .then(data => setPool(data))
        .catch(console.error);
    }
  }, [isOpen]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[1000] flex justify-end">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/20 z-[999]"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="relative h-[100vh] w-[520px] overflow-y-auto flex flex-col z-[1000]"
          style={{
            background: 'rgba(255,255,255,0.85)',
            backdropFilter: 'blur(30px)',
            borderLeft: '1px solid rgba(255,255,255,0.9)',
            boxShadow: '-8px 0 40px rgba(0,0,0,0.08)',
          }}
        >
          {/* Header */}
          <div className="sticky top-0 right-0 p-6 flex justify-between items-center" style={{ background: 'linear-gradient(to bottom, rgba(255,255,255,0.95), rgba(255,255,255,0))' }}>
            <h2 style={{ fontFamily: 'Plus Jakarta Sans', fontSize: '18px', fontWeight: 800, color: '#3d2f2a' }}>Documentation</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-900 transition-colors bg-white rounded-full p-1 shadow-sm border border-gray-200"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px' }}
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          <div className="px-8 pb-12 flex flex-col gap-8">
            <style>{`
              .doc-section-header {
                font-family: 'Plus Jakarta Sans', sans-serif;
                font-size: 13px;
                font-weight: 700;
                color: #d95c41;
                text-transform: uppercase;
                letter-spacing: 0.08em;
                margin-bottom: 8px;
              }
              .doc-body {
                font-family: 'Plus Jakarta Sans', sans-serif;
                font-size: 13px;
                color: #3d2f2a;
                line-height: 1.65;
              }
              .doc-inline-code {
                font-family: 'JetBrains Mono', monospace;
                font-size: 12px;
                background: rgba(0,0,0,0.06);
                padding: 2px 6px;
                border-radius: 4px;
                color: #c0392b;
              }
              .doc-code-block {
                font-family: 'JetBrains Mono', monospace;
                font-size: 12px;
                background: rgba(0,0,0,0.05);
                border: 1px solid rgba(0,0,0,0.08);
                border-radius: 8px;
                padding: 12px;
                display: block;
                margin: 8px 0;
                white-space: pre-wrap;
              }
              .doc-divider {
                border-top: 1px solid rgba(0,0,0,0.06);
                margin: 0;
              }
              .doc-ul {
                list-style-type: disc;
                margin-left: 20px;
                margin-bottom: 8px;
              }
            `}</style>

            <section>
              <h3 className="doc-section-header">PROJECT OVERVIEW</h3>
              <p className="doc-body">
                DHCP.EMU is a full-stack DHCP protocol emulator that performs real DHCP packet exchanges across three Ubuntu VMs. It uses Scapy for raw packet construction per RFC 2131, RFC 2132, and RFC 3046. The dashboard provides live visibility into every packet on the wire.
              </p>
            </section>
            <hr className="doc-divider" />

            <section>
              <h3 className="doc-section-header">SYSTEM REQUIREMENTS</h3>
              <ul className="doc-body doc-ul">
                <li>Mac with Apple Silicon (arm64)</li>
                <li>UTM installed with 3 Ubuntu 22.04 VMs</li>
                <li>Python 3.10+ on all VMs</li>
                <li>Scapy 2.5.0 on all VMs: <span className="doc-inline-code">pip install scapy==2.5.0 --break-system-packages</span></li>
                <li>Node.js 18+ on Mac (for frontend)</li>
                <li>FastAPI + Uvicorn on Mac: <span className="doc-inline-code">pip install fastapi uvicorn requests --break-system-packages</span></li>
              </ul>
            </section>
            <hr className="doc-divider" />

            <section>
              <h3 className="doc-section-header">VM CONFIGURATION</h3>
              <p className="doc-body">Three VMs are required, each with two network interfaces:</p>
              <ul className="doc-body doc-ul">
                <li><span className="doc-inline-code">enp0s1</span> — Host-Only adapter (DHCP traffic)</li>
                <li><span className="doc-inline-code">enp0s2</span> — NAT adapter (management, SSH, event reporting)</li>
              </ul>
              <div className="doc-body mt-4">
                <strong>VM1 — DHCP Server</strong><br/>
                Host-Only IP: {config.VM_SERVER_IP}<br/>
                SSH alias: <span className="doc-inline-code">vm-server</span><br/>
                Role: Runs <span className="doc-inline-code">server.py</span>, manages <span className="doc-inline-code">leases.json</span>
                <br/><br/>
                <strong>VM2 — DHCP Client</strong><br/>
                Host-Only IP: {config.VM_CLIENT_IP}<br/>
                SSH alias: <span className="doc-inline-code">vm-client</span><br/>
                Role: Runs <span className="doc-inline-code">client.py</span>, receives IP assignments
                <br/><br/>
                <strong>VM3 — Relay Agent</strong><br/>
                Host-Only IP: {config.VM_RELAY_IP}<br/>
                SSH alias: <span className="doc-inline-code">vm-agent</span><br/>
                Role: Runs <span className="doc-inline-code">relay.py</span>, injects Option 82
              </div>
            </section>
            <hr className="doc-divider" />

            <section>
              <h3 className="doc-section-header">SSH SETUP</h3>
              <p className="doc-body">Add these entries to <span className="doc-inline-code">~/.ssh/config</span> on your Mac:</p>
              <pre className="doc-code-block doc-body">
{`Host vm-server
  HostName ${config.VM_SERVER_IP}
  User shashwat
  IdentityFile ~/.ssh/id_rsa

Host vm-client
  HostName ${config.VM_CLIENT_IP}
  User shashwat
  IdentityFile ~/.ssh/id_rsa

Host vm-agent
  HostName ${config.VM_RELAY_IP}
  User shashwat
  IdentityFile ~/.ssh/id_rsa`}
              </pre>
              <p className="doc-body mt-2">Generate and copy SSH key to each VM:</p>
              <pre className="doc-code-block doc-body">
{`ssh-keygen -t rsa -b 4096
ssh-copy-id shashwat@${config.VM_SERVER_IP}
ssh-copy-id shashwat@${config.VM_CLIENT_IP}
ssh-copy-id shashwat@${config.VM_RELAY_IP}`}
              </pre>
            </section>
            <hr className="doc-divider" />

            <section>
              <h3 className="doc-section-header">DEPLOYING VM SCRIPTS</h3>
              <p className="doc-body">Copy server script to VM1:</p>
              <pre className="doc-code-block doc-body">
{`scp ~/Desktop/dhcp-emulator/vm1_server/server.py vm-server:~/dhcp-server/vm1_server/server.py`}
              </pre>
              <p className="doc-body mt-2">Copy client script to VM2:</p>
              <pre className="doc-code-block doc-body">
{`scp ~/Desktop/dhcp-emulator/vm2_client/client.py vm-client:~/dhcp-client/vm2_client/client.py`}
              </pre>
              <p className="doc-body mt-2">Copy relay script to VM3:</p>
              <pre className="doc-code-block doc-body">
{`scp ~/Desktop/dhcp-emulator/vm3_relay/relay.py vm-agent:~/dhcp-relay/vm3_relay/relay.py`}
              </pre>
              <p className="doc-body mt-2 italic">
                Note: Always SCP after editing any VM script on your Mac, then restart the daemon.
              </p>
            </section>
            <hr className="doc-divider" />

            <section>
              <h3 className="doc-section-header">STARTING THE PROJECT</h3>
              <p className="doc-body">Run these commands in order:</p>
              <div className="doc-body mt-2">
                1. Start backend (Mac):
                <pre className="doc-code-block doc-body">
{`pkill -f 'uvicorn mac_backend.main' || true
nohup python3 -m uvicorn mac_backend.main:app --host 0.0.0.0 --port 8000 > /tmp/mac_backend.log 2>&1 &`}
                </pre>
                2. Start frontend (Mac):
                <pre className="doc-code-block doc-body">
{`cd ~/Desktop/dhcp-emulator/mac_frontend && npm run dev`}
                </pre>
                3. Start DHCP server (VM1):
                <pre className="doc-code-block doc-body">
{`ssh vm-server "sudo pkill -f '[s]erver.py' || true && nohup sudo /usr/bin/python3 -u ~/dhcp-server/vm1_server/server.py > /tmp/server.log 2>&1 &"`}
                </pre>
                4. Start relay agent (VM3):
                <pre className="doc-code-block doc-body">
{`ssh vm-agent "sudo pkill -f '[r]elay.py' || true && nohup sudo /usr/bin/python3 -u ~/dhcp-relay/vm3_relay/relay.py > /tmp/relay.log 2>&1 &"`}
                </pre>
                5. Open dashboard:
                <pre className="doc-code-block doc-body">
{`http://localhost:5173`}
                </pre>
              </div>
            </section>
            <hr className="doc-divider" />

            <section>
              <h3 className="doc-section-header">RUNNING A DHCP EXCHANGE</h3>
              <p className="doc-body">
                Click START EXCHANGE to trigger a full DORA sequence using the real <span className="doc-inline-code">vm-client</span>. Watch the Live Packet Feed for all 4 steps: DISCOVER → OFFER → REQUEST → ACK. The assigned IP appears in the LEASE ASSIGNED block and in the Leases tab.
              </p>
            </section>
            <hr className="doc-divider" />

            <section>
              <h3 className="doc-section-header">PACKET BUILDER</h3>
              <p className="doc-body">
                Use the Packet Builder tab to inject custom DHCP packets with a specified MAC address. Select Random MAC to test pool allocation, or enter a specific MAC to test lease renewal. Click Inject & Watch to see the full exchange in the Live Packet Feed.
              </p>
            </section>
            <hr className="doc-divider" />

            <section>
              <h3 className="doc-section-header">RFC COMPLIANCE VALIDATOR</h3>
              <p className="doc-body">
                The Validation tab runs 14 automated checks against the most recent completed exchange, verifying compliance with RFC 2131, RFC 2132, and RFC 3046. All 14 checks should pass on a clean exchange.
              </p>
            </section>
            <hr className="doc-divider" />

            <section>
              <h3 className="doc-section-header">DHCP POOL</h3>
              <ul className="doc-body doc-ul">
                <li>Subnet: {config.VM_GATEWAY ? config.VM_GATEWAY.replace(/\.\d+$/, '.0/24') : '192.168.128.0/24'}</li>
                <li>Pool range: {pool.start_ip} – {pool.end_ip}</li>
                <li>Gateway: {config.VM_GATEWAY || '192.168.128.1'}</li>
                <li>DNS: 8.8.8.8, 8.8.4.4</li>
                <li>Lease time: 86400 seconds (24 hours)</li>
                <li>T1 renewal: 43200 seconds</li>
                <li>T2 rebinding: 75600 seconds</li>
              </ul>
            </section>
            <hr className="doc-divider" />

            <section>
              <h3 className="doc-section-header">TROUBLESHOOTING</h3>
              <p className="doc-body">VM client goes offline after reset:</p>
              <pre className="doc-code-block doc-body">
{`ssh vm-client "sudo ip addr add ${config.VM_CLIENT_IP}/24 dev enp0s1 2>/dev/null || true && sudo ip link set enp0s1 up"`}
              </pre>
              <p className="doc-body mt-2">Check server logs:</p>
              <pre className="doc-code-block doc-body">
{`ssh vm-server "tail -50 /tmp/server.log"`}
              </pre>
              <p className="doc-body mt-2">Check relay logs:</p>
              <pre className="doc-code-block doc-body">
{`ssh vm-agent "tail -50 /tmp/relay.log"`}
              </pre>
              <p className="doc-body mt-2">Check backend logs:</p>
              <pre className="doc-code-block doc-body">
{`tail -50 /tmp/mac_backend.log`}
              </pre>
              <p className="doc-body mt-2">
                Restart everything from scratch: use the RESET button in the top navbar, then restart VM daemons manually.
              </p>
            </section>

          </div>
        </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
