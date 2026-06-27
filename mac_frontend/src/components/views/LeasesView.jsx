import React, { useState, useEffect } from 'react';

export default function LeasesView({ events }) {
  const [leases, setLeases] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [now, setNow] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [totalPoolSize, setTotalPoolSize] = useState(101);

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(interval);
  }, []);

  const formatExpiry = (expiry) => {
    if (!expiry) return 'Unknown';
    if (expiry < now) return 'EXPIRED';
    const diff = expiry - now;
    const hours = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    return `${expiry.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} (${hours}h ${mins}m remaining)`;
  };

  const fetchLeases = () => {
    setLoading(true);
    fetch('http://localhost:8000/api/leases')
      .then(res => res.json())
      .then(data => {
        if (data && typeof data === 'object' && !Array.isArray(data)) {
          const arr = Object.entries(data).map(([mac, val]) => ({
            mac_address: mac,
            ip_address: val.ip,
            assigned_at: val.assigned_at,
            expires_at: val.expires_at,
            hostname: val.hostname || '-'
          }));
          setLeases(arr);
        } else if (Array.isArray(data)) {
          setLeases(data);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));

    fetch('http://localhost:8000/api/leases/history')
      .then(res => res.json())
      .then(data => setHistory(data))
      .catch(console.error);
  };

  useEffect(() => {
    fetch('http://localhost:8000/api/pool/info')
      .then(res => res.json())
      .then(data => setTotalPoolSize(data.total_pool_size || 101))
      .catch(console.error);
      
    fetchLeases();
    const interval = setInterval(fetchLeases, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (events && events.length > 0) {
      const lastEvent = events[events.length - 1];
      if (lastEvent.event === 'IP_ASSIGNED' || lastEvent.event === 'RESET' || lastEvent.event === 'LEASE_RELEASED' || lastEvent.event === 'ACK_SENT') {
        fetchLeases();
      }
    }
  }, [events]);

  const used = leases.length;
  const percentage = totalPoolSize > 0 ? (used / totalPoolSize) * 100 : 0;
  
  const filteredLeases = leases.filter(lease => {
    const term = searchQuery.toLowerCase();
    return (lease.mac_address || '').toLowerCase().includes(term) ||
           (lease.ip_address || '').toLowerCase().includes(term) ||
           (lease.hostname || '').toLowerCase().includes(term);
  });

  return (
    <div className="flex flex-col gap-6 h-full overflow-y-auto pb-24">
      
      {/* Pool Utilization Bar */}
      <div className="glass-panel rounded-xl p-6 border border-white/10 shadow-sm flex flex-col gap-4 shrink-0">
        <div className="flex justify-between items-center font-label-mono">
          <div className="text-on-surface font-bold">Pool Utilization</div>
          <div className="text-primary font-bold text-sm bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
            {used} / {totalPoolSize} addresses in use ({percentage.toFixed(2)}%)
          </div>
        </div>
        <div className="w-full h-6 bg-surface-variant rounded-full overflow-hidden flex border border-outline-variant/30 relative shadow-inner">
          <div 
            className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-1000"
            style={{ width: `${percentage}%` }}
          />
          <div className="absolute inset-0 flex items-center px-4 font-label-mono text-[10px] opacity-40 mix-blend-difference text-white tracking-widest pointer-events-none">
            {Array.from({ length: 40 }).map((_, i) => i < Math.floor(percentage / 2.5) ? '█' : '░').join('')}
          </div>
        </div>
      </div>

      <header className="mb-2 flex justify-between items-end gap-4 flex-wrap">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-on-background">Active Leases</h2>
          <p className="font-body-md text-body-md text-on-surface-variant mt-1">Real-time binding table tracking MAC to IP mappings.</p>
        </div>
        <div className="flex items-center gap-3 ml-auto">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">search</span>
            <input 
              type="text"
              placeholder="Search MAC, IP, Hostname..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 bg-surface-container border border-outline-variant/50 rounded-lg text-sm font-label-mono text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-primary/50 w-64 transition-colors"
            />
          </div>
          <button 
            onClick={fetchLeases}
            className="flex items-center gap-2 px-4 py-2 bg-surface-container hover:bg-surface-variant text-on-surface rounded-lg font-label-mono transition-colors border border-outline-variant/50 shadow-sm"
          >
            <span className={`material-symbols-outlined text-[18px] ${loading ? 'animate-spin' : ''}`}>refresh</span>
            Refresh
          </button>
        </div>
      </header>

      {filteredLeases.length === 0 ? (
        <div className="glass-panel flex flex-col items-center justify-center py-20 rounded-xl border border-white/10 text-on-surface-variant shadow-sm">
          <span className="material-symbols-outlined text-6xl mb-4 opacity-50">receipt_long</span>
          <p className="font-label-mono">{searchQuery ? 'No leases match your search' : 'No active leases'}</p>
        </div>
      ) : (
        <div className="glass-panel rounded-xl border border-white/10 shadow-sm overflow-hidden shrink-0">
          <table className="w-full text-left font-label-mono text-sm">
            <thead className="bg-surface-variant/50 text-on-surface-variant border-b border-white/10">
              <tr>
                <th className="px-6 py-4 font-semibold tracking-wide uppercase text-xs">MAC Address</th>
                <th className="px-6 py-4 font-semibold tracking-wide uppercase text-xs">Hostname</th>
                <th className="px-6 py-4 font-semibold tracking-wide uppercase text-xs">Assigned IP</th>
                <th className="px-6 py-4 font-semibold tracking-wide uppercase text-xs">Lease Expiry</th>
                <th className="px-6 py-4 font-semibold tracking-wide uppercase text-xs">Status / Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-on-surface">
              {filteredLeases.map((lease, i) => {
                const expiry = lease.expires_at 
                  ? new Date(lease.expires_at) 
                  : lease.assigned_at 
                    ? new Date(new Date(lease.assigned_at).getTime() + 86400 * 1000) 
                    : null;
                const isExpired = expiry && expiry < now;
                
                return (
                  <tr key={i} className="hover:bg-white/5 transition-colors group">
                    <td className="px-6 py-4 text-secondary font-bold tracking-wider">{lease.mac_address}</td>
                    <td className="px-6 py-4 text-on-surface-variant">{lease.hostname}</td>
                    <td className="px-6 py-4 font-bold text-emerald-400">{lease.ip_address}</td>
                    <td className="px-6 py-4 text-on-surface-variant whitespace-nowrap">{formatExpiry(expiry)}</td>
                    <td className="px-6 py-4 flex items-center gap-3">
                      {isExpired ? (
                        <span className="px-2 py-1 bg-error/10 text-error rounded text-[10px] uppercase font-bold border border-error/20 w-16 text-center shadow-sm">Expired</span>
                      ) : (
                        <span className="px-2 py-1 bg-tertiary-container/30 text-tertiary rounded text-[10px] uppercase font-bold border border-tertiary/20 w-16 text-center shadow-sm">Bound</span>
                      )}
                      
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => {
                            fetch('http://localhost:8000/api/leases/renew', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ mac: lease.mac_address, ip: lease.ip_address })
                            }).then(() => setTimeout(fetchLeases, 1000)).catch(console.error);
                          }}
                          className="px-3 py-1 bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 rounded text-[10px] uppercase font-bold border border-amber-500/20 transition-colors flex items-center gap-1 shadow-sm"
                          title="Send Unicast Renewal (REQUEST)"
                        >
                          <span className="material-symbols-outlined text-[12px]">autorenew</span> Renew
                        </button>

                        <button 
                          onClick={() => {
                            fetch('http://localhost:8000/api/leases/release', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ mac: lease.mac_address, ip: lease.ip_address })
                            }).catch(console.error);
                          }}
                          className="px-3 py-1 bg-error/10 text-error hover:bg-error/20 rounded text-[10px] uppercase font-bold border border-error/20 transition-colors flex items-center gap-1 shadow-sm"
                        >
                          <span className="material-symbols-outlined text-[12px]">close</span> Release
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Lease History */}
      <h3 className="font-headline-md text-headline-md mt-6 mb-2">Lease History</h3>
      {history.length === 0 ? (
        <div className="glass-panel flex flex-col items-center justify-center py-10 rounded-xl border border-white/10 text-on-surface-variant shadow-sm mb-8">
          <p className="font-label-mono text-sm">No historical records available</p>
        </div>
      ) : (
        <div className="glass-panel rounded-xl border border-white/10 shadow-sm overflow-hidden mb-8 shrink-0">
          <table className="w-full text-left font-label-mono text-xs">
            <thead className="bg-surface-variant/30 text-on-surface-variant border-b border-white/10">
              <tr>
                <th className="px-6 py-3 font-semibold tracking-wide uppercase">MAC Address</th>
                <th className="px-6 py-3 font-semibold tracking-wide uppercase">IP Address</th>
                <th className="px-6 py-3 font-semibold tracking-wide uppercase">Assigned At</th>
                <th className="px-6 py-3 font-semibold tracking-wide uppercase">Ended At</th>
                <th className="px-6 py-3 font-semibold tracking-wide uppercase">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-on-surface-variant">
              {history.slice().reverse().map((record, i) => (
                <tr key={i} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-3 font-bold">{record.mac}</td>
                  <td className="px-6 py-3">{record.ip}</td>
                  <td className="px-6 py-3">{record.assigned_at ? new Date(record.assigned_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : '-'}</td>
                  <td className="px-6 py-3">{record.ended_at ? new Date(record.ended_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : '-'}</td>
                  <td className="px-6 py-3">
                    <span className={`px-2 py-0.5 rounded uppercase font-bold border text-[9px] ${
                      record.reason === 'RELEASED' 
                        ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' 
                        : 'bg-error/10 text-error border-error/20'
                    }`}>
                      {record.reason}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
