import React from 'react';

export default function ScopesView() {
 const scopeData = {
 Subnet: '192.168.128.0/24',
 Mask: '255.255.255.0',
 Gateway: '192.168.128.1',
 DNS: '8.8.8.8, 8.8.4.4',
 Broadcast: '192.168.128.255',
 Lease: '86400 seconds (24 hours)',
 T1: '43200 seconds',
 T2: '75600 seconds'
};
  const getTooltip = (k) => {
    if (k === 'Gateway') return 'gateway';
    if (k === 'DNS') return 'DNS';
    if (k === 'Broadcast') return 'broadcast';
    if (k === 'Lease') return 'lease_time';
    if (k === 'Mask') return 'subnet_mask';
    if (k === 'T1') return 'renewal_time';
    if (k === 'T2') return 'rebinding_time';
    return undefined;
  };

  return (
  <div className="flex flex-col gap-6">
  <header className="mb-4">
  <h2 className="font-headline-lg text-headline-lg text-on-background">DHCP Scopes</h2>
  <p className="font-body-md text-body-md text-on-surface-variant mt-1">Configuration parameters for the active subnet.</p>
  </header>

  <div className="glass-card rounded-2xl p-padding-card shadow-md max-w-2xl border-l-4 border-l-primary">
  <h3 className="font-label-mono text-primary font-bold uppercase mb-6 tracking-wider flex items-center gap-2">
  <span className="material-symbols-outlined">settings_ethernet</span> Scope: 192.168.128.0
  </h3>
  <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8 font-label-mono text-sm">
  {Object.entries(scopeData).map(([key, val]) => (
  <div key={key} className="flex flex-col gap-1 border-b border-white/5 pb-2">
  <span className="text-on-surface-variant uppercase text-xs tracking-wider" data-tooltip={getTooltip(key)}>{key}</span>
  <span className="text-on-surface font-semibold">{val}</span>
  </div>
  ))}
  </div>
  </div>
  </div>
  );
}
