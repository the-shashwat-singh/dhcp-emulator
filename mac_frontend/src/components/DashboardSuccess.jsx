import React from 'react';

export default function DashboardSuccess({ events, globalState, isHexDump}) {
 const ip = globalState.client_ip || '192.168.1.105';

 const downloadPcap = () => {
 window.open('http://localhost:8000/api/pcap/download', '_blank');
};

 return (
 <>
 <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-4">
 <div>
 <h1 className="font-display-lg text-display-lg text-on-surface font-bold tracking-tight">Lease Successful</h1>
 <p className="font-body-lg text-body-lg text-on-surface-variant mt-2 max-w-2xl">The client node has successfully completed the <span data-tooltip="DORA">DORA</span> process and acquired a valid IP address. The network topology is stable.</p>
 </div>
 <div className="flex gap-3">
 <button onClick={downloadPcap} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-label-mono text-label-mono font-bold cursor-pointer border border-primary/20">
 <span className="material-symbols-outlined text-[18px]">download</span>
 Export PCAP
 </button>
 <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#E6F4EA] text-[#137333] font-label-mono text-label-mono border border-[#CEEAD6]">
 <span className="material-symbols-outlined text-[16px]">check_circle</span>
 System Nominal
 </span>
 </div>
 </header>

 <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter flex-1">
 
 {/* Central IP Display (Hero Component) */}
 <div className="lg:col-span-8 glass-panel rounded-xl p-padding-card flex flex-col relative overflow-hidden group">
 <div className="absolute -top-24 -right-24 w-64 h-64 bg-[#34A853]/10 rounded-full blur-3xl group-hover:bg-[#34A853]/20 transition-colors duration-1000"></div>
 
 <div className="flex justify-between items-start mb-auto z-10">
 <div className="font-label-mono text-label-mono text-on-surface-variant uppercase tracking-wider flex items-center gap-2">
 <span className="material-symbols-outlined text-primary">dns</span> Assigned Address
 </div>
 <div className="flex items-center gap-2 bg-[#E6F4EA] text-[#137333] px-3 py-1 rounded-full text-xs font-medium border border-[#CEEAD6]">
 <span className="w-2 h-2 rounded-full bg-[#1E8E3E] animate-pulse"></span> Lease <span data-tooltip="BOUND">Bound</span>
 </div>
 </div>
 
 <div className="flex flex-col items-center justify-center py-12 z-10">
 <div className="font-display-lg text-[64px] md:text-[80px] leading-none font-bold text-on-surface tracking-tighter tabular-nums drop-shadow-sm">
 {ip}
 </div>
 <div className="mt-6 flex flex-wrap gap-4 justify-center">
 <div className="glass-panel px-4 py-2 rounded-lg flex items-center gap-3 border border-white/10 ">
 <span className="text-xs text-on-surface-variant uppercase tracking-wider font-label-mono">Subnet</span>
 <span className="font-mono text-sm font-semibold">255.255.255.0</span>
 </div>
 <div className="glass-panel px-4 py-2 rounded-lg flex items-center gap-3 border border-white/10 ">
 <span className="text-xs text-on-surface-variant uppercase tracking-wider font-label-mono"><span data-tooltip="gateway">Gateway</span></span>
 <span className="font-mono text-sm font-semibold">192.168.128.1</span>
 </div>
 <div className="glass-panel px-4 py-2 rounded-lg flex items-center gap-3 border border-white/10 ">
 <span className="text-xs text-on-surface-variant uppercase tracking-wider font-label-mono">Lease Time</span>
 <span className="font-mono text-sm font-semibold text-primary">24:00:00</span>
 </div>
 </div>
 </div>
 </div>

 {/* Transaction Log (DORA) */}
 <div className="lg:col-span-4 glass-panel rounded-xl p-padding-card flex flex-col h-full border border-white/10 ">
 <div className="flex justify-between items-center mb-6">
 <h3 className="font-headline-md text-headline-md text-on-surface font-semibold">Transaction Log</h3>
 </div>
 
 <div className="flex-1 flex flex-col gap-0 relative">
 {/* Vertical Line connecting steps */}
 <div className="absolute left-[19px] top-6 bottom-6 w-px bg-outline-variant/50"></div>
 
 {['DISCOVER', 'OFFER', 'REQUEST', 'ACK'].map((step, idx) => {
 const eventData = events.find(e => e.event && e.event.includes(step));
 let icon = 'search';
 let desc = 'Client broadcasted request';
 if (step === 'OFFER') { icon = 'local_offer'; desc = `Server proposed ${ip}`;}
 if (step === 'REQUEST') { icon = 'waving_hand'; desc = `Client requested ${ip}`;}
 if (step === 'ACK') { icon = 'check_circle'; desc = `Server acknowledged lease`;}

 return (
 <div key={idx} className="flex gap-4 py-3 relative z-10">
 <div className="w-10 h-10 rounded-full bg-[#E6F4EA] border-2 border-white flex items-center justify-center shrink-0 shadow-sm z-10">
 <span className="material-symbols-outlined text-[#137333] text-[18px]">{icon}</span>
 </div>
 <div className="flex-1 pt-2">
 <div className="flex justify-between items-baseline mb-1">
 <span className="font-semibold text-sm text-on-surface">DHCP {step}</span>
 {eventData && <span className="text-[10px] text-on-surface-variant font-mono">{new Date(eventData.timestamp * 1000 || Date.now()).toLocaleTimeString()}</span>}
 </div>
 <p className="text-xs text-on-surface-variant">{desc}</p>
 </div>
 </div>
 );
})}
 </div>
 </div>

 </div>
 </>
 );
}
