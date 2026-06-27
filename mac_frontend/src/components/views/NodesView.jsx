import React, { useState, useEffect} from 'react';

export default function NodesView() {
 const [nodes, setNodes] = useState([
 { name: 'VM1', role: 'DHCP Server', ip: '192.168.128.10', status: 'Online'},
 { name: 'VM2', role: 'DHCP Client', ip: '192.168.128.50', status: 'Online'},
 { name: 'VM3', role: 'Relay Agent', ip: '192.168.128.20', status: 'Online'}
 ]);

  useEffect(() => {
    fetch('http://localhost:8000/api/config')
      .then(res => res.json())
      .then(data => {
        if (data) {
          setNodes([
            { name: 'VM1', role: 'DHCP Server', ip: data.VM_SERVER_IP || '192.168.128.10', status: 'Online'},
            { name: 'VM2', role: 'DHCP Client', ip: data.VM_CLIENT_IP || '192.168.128.50', status: 'Online'},
            { name: 'VM3', role: 'Relay Agent', ip: data.VM_RELAY_IP || '192.168.128.20', status: 'Online'}
          ]);
        }
      })
      .catch(console.error);
  }, []);

 return (
 <div className="flex flex-col gap-6">
 <header className="mb-4">
 <h2 className="font-headline-lg text-headline-lg text-on-background">Topology Nodes</h2>
 <p className="font-body-md text-body-md text-on-surface-variant mt-1">Live status of all virtual machines in the network.</p>
 </header>

 <div className="glass-panel rounded-xl border border-white/10 shadow-sm overflow-hidden">
 <table className="w-full text-left font-label-mono text-sm">
 <thead className="bg-surface-variant/50 text-on-surface-variant">
 <tr>
 <th className="px-6 py-4">Node</th>
 <th className="px-6 py-4">Role</th>
 <th className="px-6 py-4">IP Address</th>
 <th className="px-6 py-4">Status</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-white/5 text-on-surface">
 {nodes.map((node, i) => (
 <tr key={i} className="hover:bg-white/5 transition-colors">
 <td className="px-6 py-4 font-bold">
   <span data-tooltip={node.name === 'VM1' ? 'vm-server (VM1)' : node.name === 'VM2' ? 'vm-client (VM2)' : 'vm-agent (VM3)'}>{node.name}</span>
 </td>
 <td className="px-6 py-4">
   <span data-tooltip={node.role === 'DHCP Server' ? 'vm-server (VM1)' : node.role === 'DHCP Client' ? 'vm-client (VM2)' : 'vm-agent (VM3)'}>{node.role}</span>
 </td>
 <td className="px-6 py-4">{node.ip}</td>
 <td className="px-6 py-4 flex items-center gap-2">
 <span className={`w-2 h-2 rounded-full ${node.status === 'Online' ? 'bg-[#10b981]' : 'bg-error'}`}></span>
 {node.status}
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </div>
 );
}
