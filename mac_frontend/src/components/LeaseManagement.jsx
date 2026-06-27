import React, { useState, useEffect} from 'react';
import { Server, Trash2, Save} from 'lucide-react';

export default function LeaseManagement() {
 const [leases, setLeases] = useState({});
 const [pool, setPool] = useState({ start_ip: '192.168.128.100', end_ip: '192.168.128.200'});
 const [saving, setSaving] = useState(false);

 const fetchLeases = async () => {
 try {
 const res = await fetch('http://localhost:8000/api/leases');
 if (res.ok) {
 const data = await res.json();
 setLeases(data);
}
} catch (e) {
 console.error(e);
}
};

 useEffect(() => {
 fetchLeases();
 const interval = setInterval(fetchLeases, 10000); // refresh every 10s
 return () => clearInterval(interval);
}, []);

 const handleUpdatePool = async () => {
 setSaving(true);
 try {
 await fetch('http://localhost:8000/api/config/pool', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json'},
 body: JSON.stringify(pool)
});
 alert("Pool updated and server restarted.");
} catch (e) {
 console.error(e);
}
 setSaving(false);
};

 const handleRelease = async (mac, ip) => {
 try {
 await fetch(`http://localhost:8000/api/leases/${ip}`, { method: 'DELETE'});
 alert(`Deleted lease for ${ip}`);
 fetchLeases();
} catch (e) {
 console.error(e);
}
};

 return (
 <div className="flex flex-col h-full bg-black/50 p-6 rounded-lg overflow-y-auto">
 <div className="flex items-center gap-3 mb-6 border-b border-gray-800 pb-4">
 <Server className="w-6 h-6 text-emerald-400" />
 <h3 className="text-lg font-semibold text-white tracking-wide">Pool & Lease Management</h3>
 </div>

 <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-800 mb-8">
 <h4 className="text-sm font-semibold text-gray-400 mb-4 uppercase tracking-wider">Configure DHCP Pool</h4>
 <div className="flex items-end gap-4">
 <div>
 <label className="block text-xs text-gray-500 mb-1">Start IP</label>
 <input 
 type="text" 
 value={pool.start_ip} 
 onChange={e => setPool({...pool, start_ip: e.target.value})}
 className="bg-black border border-gray-700 text-white rounded px-3 py-2 text-sm focus:border-emerald-500 outline-none w-40"
 />
 </div>
 <div>
 <label className="block text-xs text-gray-500 mb-1">End IP</label>
 <input 
 type="text" 
 value={pool.end_ip} 
 onChange={e => setPool({...pool, end_ip: e.target.value})}
 className="bg-black border border-gray-700 text-white rounded px-3 py-2 text-sm focus:border-emerald-500 outline-none w-40"
 />
 </div>
 <button 
 onClick={handleUpdatePool}
 disabled={saving}
 className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded font-medium text-sm transition-colors"
 >
 {saving ? <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> : <Save className="w-4 h-4" />}
 Update & Restart Server
 </button>
 </div>
 </div>

 <div className="bg-gray-900/50 rounded-lg border border-gray-800 flex-1 flex flex-col">
 <h4 className="text-sm font-semibold text-gray-400 m-4 uppercase tracking-wider">Active Leases</h4>
 <div className="overflow-x-auto pb-4 px-4">
 <table className="w-full text-left text-sm text-gray-300">
 <thead className="text-xs text-gray-500 uppercase border-b border-gray-800 bg-black/20">
 <tr>
 <th className="px-4 py-3">IP Address</th>
 <th className="px-4 py-3">MAC Address</th>
 <th className="px-4 py-3">Hostname</th>
 <th className="px-4 py-3">Assigned At</th>
 <th className="px-4 py-3">Status</th>
 <th className="px-4 py-3">Actions</th>
 </tr>
 </thead>
 <tbody>
 {Object.keys(leases).length === 0 ? (
 <tr><td colSpan="6" className="text-center py-6 text-gray-500">No active leases</td></tr>
 ) : (
 Object.entries(leases).map(([mac, lease]) => {
 const now = new Date();
 const expDateObj = new Date(lease.expires_at || lease.assigned_at);
 const isExpired = lease.expires_at ? now > expDateObj : false;
 const pad = n => n.toString().padStart(2, '0');
 const expDate = !isNaN(expDateObj.getTime()) ? `${expDateObj.getFullYear()}-${pad(expDateObj.getMonth()+1)}-${pad(expDateObj.getDate())} ${pad(expDateObj.getHours())}:${pad(expDateObj.getMinutes())}:${pad(expDateObj.getSeconds())}` : "Invalid Date";
 return (
 <tr key={mac} className="border-b border-gray-800/50 hover:bg-white/5">
 <td className="px-4 py-3 font-mono text-emerald-400">{lease.ip}</td>
 <td className="px-4 py-3 font-mono">{mac}</td>
 <td className="px-4 py-3">{lease.hostname || '-'}</td>
 <td className="px-4 py-3 text-xs">{expDate}</td>
 <td className="px-4 py-3">
 <span className={`px-2 py-1 rounded text-[10px] font-bold ${isExpired ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
 {isExpired ? 'EXPIRED' : 'ACTIVE'}
 </span>
 </td>
 <td className="px-4 py-3">
 <button 
 onClick={() => handleRelease(mac, lease.ip)}
 className="flex items-center gap-1 text-xs bg-red-600/20 hover:bg-red-600/40 text-red-400 px-2 py-1 rounded transition-colors"
 >
 <Trash2 className="w-3 h-3" /> <span data-tooltip="RELEASE">Release</span>
 </button>
 </td>
 </tr>
 );
})
 )}
 </tbody>
 </table>
 </div>
 </div>
 </div>
 );
}
