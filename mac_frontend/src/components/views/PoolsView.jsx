import React, { useState, useEffect} from 'react';

export default function PoolsView({ events}) {
 const [leases, setLeases] = useState([]);
 const [totalPoolSize] = useState(101); // .100 to .200

 const fetchLeases = () => {
 fetch('http://localhost:8000/api/leases')
 .then(res => res.json())
 .then(data => {
 if (data && typeof data === 'object' && !Array.isArray(data)) {
 const arr = Object.entries(data).map(([mac, val]) => ({
 mac_address: mac,
 ip_address: val.ip,
 lease_end: val.lease_end || Date.now() / 1000 + 86400
}));
 setLeases(arr);
} else if (Array.isArray(data)) {
 setLeases(data);
}
})
 .catch(() => {});
};

 useEffect(() => {
 fetchLeases();
}, []);

 useEffect(() => {
 if (events && events.length > 0) {
 const lastEvent = events[events.length - 1];
 if (lastEvent.event === 'IP_ASSIGNED' || lastEvent.event === 'RESET') {
 fetchLeases();
}
}
}, [events]);

 const used = leases.length;
 const percentage = (used / totalPoolSize) * 100;

 return (
 <div className="flex flex-col gap-6">
 <header className="mb-4">
 <h2 className="font-headline-lg text-headline-lg text-on-background">IP Address Pool</h2>
 <p className="font-body-md text-body-md text-on-surface-variant mt-1">Resource allocation and capacity planning.</p>
 </header>

 <div className="glass-panel rounded-xl p-8 border border-white/10 shadow-sm flex flex-col gap-6">
 <div className="flex justify-between items-center font-label-mono">
 <div className="text-on-surface">
 <span className="text-on-surface-variant">Range:</span> 192.168.128.100 — 192.168.128.200
 </div>
 <div className="text-primary font-bold">{used} / {totalPoolSize} addresses used</div>
 </div>

 <div className="w-full h-8 bg-surface-variant rounded-full overflow-hidden flex border border-outline-variant/30 relative">
 <div 
 className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-1000"
 style={{ width: `${percentage}%`}}
 />
 <div className="absolute inset-0 flex items-center px-4 font-label-mono text-xs opacity-50 mix-blend-difference text-white tracking-widest pointer-events-none">
 {Array.from({ length: 40}).map((_, i) => i < Math.floor(percentage / 2.5) ? '█' : '░').join('')}
 </div>
 </div>
 </div>

 <h3 className="font-headline-md text-headline-md mt-6">Allocated Addresses</h3>
 <div className="glass-panel rounded-xl p-6 flex flex-wrap gap-3">
 {leases.length === 0 ? (
 <span className="text-on-surface-variant italic">No IP addresses currently allocated from the pool.</span>
 ) : (
 leases.map((l, i) => (
 <div key={i} className="px-3 py-1.5 bg-secondary-container/20 border border-secondary/30 rounded-md font-label-mono text-sm text-secondary-fixed">
 {l.ip_address}
 </div>
 ))
 )}
 </div>
 </div>
 );
}
