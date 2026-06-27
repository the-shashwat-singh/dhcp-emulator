import React, { useState, useEffect, useRef} from 'react';
import { motion, AnimatePresence} from 'framer-motion';
import PacketDetailCard from './PacketDetailCard';
import TopologyAnimation from './TopologyAnimation';

const formatTime = (ts) => {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit', 
    second: '2-digit',
    fractionalSecondDigits: 3,
    hour12: false,
    timeZone: 'Asia/Kolkata'
  });
};

const logicalSort = (events) => {
  const sorted = [...events].sort((a,b) => 
    (a.seq ?? 999) - (b.seq ?? 999));
  
  const result = [];
  const used = new Set();
  
  for (let i = 0; i < sorted.length; i++) {
    if (used.has(i)) continue;
    const evt = sorted[i];
    
    // For relay→client OFFER/ACK, find the paired 
    // server→relay event and put it first
    if ((evt.event === 'OFFER_SENT' || 
         evt.event === 'ACK_SENT') && 
        evt.from_node === 'relay' && 
        evt.to_node === 'client') {
      // Look ahead for server→relay pair
      const pairIdx = sorted.findIndex((e, j) => 
        j > i && j < i + 3 &&
        e.event === evt.event &&
        e.from_node === 'server' &&
        e.to_node === 'relay'
      );
      if (pairIdx !== -1) {
        const serverEvt = {...sorted[pairIdx]};
        const relayEvt = {...evt};
        
        const baseTime = serverEvt.display_time || serverEvt.timestamp;
        if (baseTime) {
          relayEvt.display_time = new Date(new Date(baseTime).getTime() + 1).toISOString();
        }
        
        result.push(serverEvt);
        result.push(relayEvt);
        used.add(i);
        used.add(pairIdx);
        continue;
      }
    }
    
    if (!used.has(i)) {
      result.push(evt);
      used.add(i);
    }
  }
  return result;
};

export default function DashboardActive({ events, globalState, isHexDump}) {
  const [expandedStep, setExpandedStep] = useState(null);
  const [expandedRows, setExpandedRows] = useState(new Set());
  const feedEndRef = useRef(null);

  const toggleRow = (index) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      next.has(index) ? next.delete(index) : next.add(index);
      return next;
    });
  };

  const generateReport = () => {
    let report = `DHCP EXCHANGE REPORT\n`;
    report += `Date: ${new Date().toISOString().replace('T', ' ').split('.')[0]}\n`;
    const xid = events.find(e => e.packet?.xid)?.packet?.xid || 'N/A';
    report += `XID: ${xid}\n`;
    report += `Total Events: ${events.length}\n`;
    let assignedIpReport = globalState.client_ip && globalState.client_ip !== '0.0.0.0' ? globalState.client_ip : null;
    if (!assignedIpReport) {
      const ackEvent = [...events].reverse().find(e => e.event === 'ACK_SENT' && e.packet?.yiaddr && e.packet.yiaddr !== '0.0.0.0');
      if (ackEvent) assignedIpReport = ackEvent.packet.yiaddr;
    }
    if (assignedIpReport) {
      report += `Assigned IP: ${assignedIpReport}\n`;
    }
    report += `═══════════════════════════════════════════════\n\n`;

    const formatOptions = (options) => {
      if (!options || !Array.isArray(options)) return '           none';
      return options.map(opt => {
        if (typeof opt === 'object' && opt !== null) {
          return `           ${opt.code || opt.name}: ${opt.value}`;
        }
        return `           ${opt}`;
      }).join('\n');
    };

    events.forEach((evt, idx) => {
      let timeStr = 'N/A';
      try {
        if (evt.display_time || evt.timestamp) timeStr = formatTime(evt.display_time || evt.timestamp);
      } catch (e) {}
      const eventName = evt.event.split('_')[0];
      report += `EVENT ${idx + 1} — ${eventName}\n`;
      report += `───────────────────────────────────────────────\n`;
      report += `Time:      ${timeStr}\n`;
      const displayToNode = (evt.from_node === 'client' && (evt.event === 'DISCOVER_SENT' || evt.event === 'REQUEST_SENT')) ? 'relay' : (evt.to_node || 'server');
      report += `From:      ${evt.from_node || 'client'} → ${displayToNode}\n`;
      const sizeStr = evt.packet ? JSON.stringify(evt.packet).length + 42 + ' bytes' : 'N/A';
      report += `Size:      ${sizeStr}\n\n`;

      if (evt.packet) {
        if (evt.packet.src_mac) {
          report += `Ethernet:  ${evt.packet.src_mac} → ${evt.packet.dst_mac}\n`;
          report += `IP:        ${evt.packet.src_ip} → ${evt.packet.dst_ip}\n`;
          report += `UDP:       ${evt.packet.src_port} → ${evt.packet.dst_port}\n`;
          report += `BOOTP:     op=${evt.packet.op || 1}, hops=${evt.packet.hops || 0}, xid=${evt.packet.xid}\n`;
          report += `           ciaddr=${evt.packet.ciaddr}, yiaddr=${evt.packet.yiaddr}\n`;
          report += `           giaddr=${evt.packet.giaddr}, chaddr=${evt.packet.chaddr}\n`;
          
          if (evt.packet.options) {
            report += `DHCP Opts: 
${formatOptions(evt.packet.options)}
`;
          }
          if (evt.packet.option82) {
            report += `Option 82: circuit_id=${evt.packet.option82.circuit_id || 'N/A'}\n`;
            report += `           remote_id=${evt.packet.option82.remote_id || 'N/A'}\n`;
          }
        } else {
          report += JSON.stringify(evt.packet, null, 2) + '\n';
        }
      }
      report += `\n═══════════════════════════════════════════════\n\n`;
    });

    if (globalState.state === 'BOUND' || globalState.client_ip) {
      let gateway = 'N/A';
      let dns = 'N/A';
      let assignedIp = globalState.client_ip && globalState.client_ip !== '0.0.0.0' ? globalState.client_ip : 'N/A';

      for (const e of events) {
        if (e.packet && Array.isArray(e.packet.options)) {
          const routerOpt = e.packet.options.find(o => o.name === 'router' || o.code === 'router' || o.code === 3);
          const dnsOpt = e.packet.options.find(o => o.name === 'name_server' || o.code === 'name_server' || o.code === 6 || o.code === 'domain_name_server');
          if (routerOpt && gateway === 'N/A') gateway = routerOpt.value;
          if (dnsOpt && dns === 'N/A') dns = dnsOpt.value;
        }
        if (e.event === 'ACK_SENT' && e.packet?.yiaddr && e.packet.yiaddr !== '0.0.0.0') {
          assignedIp = e.packet.yiaddr;
        }
      }

      if (gateway === 'N/A' || dns === 'N/A') {
        const ipEvent = events.find(e => e.event === 'IP_ASSIGNED');
        if (ipEvent?.meta?.router && gateway === 'N/A') gateway = ipEvent.meta.router;
        if (ipEvent?.meta?.dns && dns === 'N/A') dns = ipEvent.meta.dns;
      }
      
      report += `RESULT: IP ${assignedIp} ASSIGNED ✓\n`;
      report += `Subnet:  ${globalState.subnet_mask || '255.255.255.0'}\n`;
      report += `Gateway: ${gateway}\n`;
      report += `DNS:     ${dns}\n`;
      report += `Lease:   ${globalState.lease_time || 86400} seconds\n`;
      report += `═══════════════════════════════════════════════\n`;
    }

    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dhcp-exchange-${xid}-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

 // Auto-scroll packet feed
 useEffect(() => {
 if (feedEndRef.current) {
 feedEndRef.current.scrollIntoView({ behavior: 'smooth'});
}
}, [events]);

 const dhcpState = globalState.state; 
  const STEP_COMPLETION_EVENTS = {
    0: ['DISCOVER_SENT', 'DISCOVER_RECEIVED', 'OPTION82_INSERTED'],
    1: ['OFFER_SENT', 'OFFER_RECEIVED', 'ACK_SENT', 'IP_ASSIGNED'],
 2: ['REQUEST_SENT'],
 3: ['ACK_SENT', 'IP_ASSIGNED'],
};

 const completedSteps = new Set();
 events.forEach(e => {
 if (e.event && STEP_COMPLETION_EVENTS[0].includes(e.event)) completedSteps.add(0);
 if (e.event && STEP_COMPLETION_EVENTS[1].includes(e.event)) completedSteps.add(1);
 if (e.event && STEP_COMPLETION_EVENTS[2].includes(e.event)) completedSteps.add(2);
 if (e.event && STEP_COMPLETION_EVENTS[3].includes(e.event)) completedSteps.add(3);
});

 const getEventByKeyword = (keyword) => {
 return [...events].reverse().find(e => e.event && e.event.includes(keyword));
};

 const BADGE_STYLES = {
 'DISCOVER': 'bg-blue-100 text-blue-700 border border-blue-200',
 'OPTION82': 'bg-amber-100 text-amber-700 border border-amber-200',
 'OFFER': 'bg-purple-100 text-purple-700 border border-purple-200',
 'REQUEST': 'bg-yellow-100 text-yellow-800 border border-yellow-200',
 'ACK': 'bg-green-100 text-green-700 border border-green-200',
 'IP': 'bg-green-500 text-white',
};

  const getBadgeStyle = (eventStr) => {
    if (!eventStr) return 'bg-gray-100 text-gray-500 border border-gray-200';
    if (eventStr.includes('DISCOVER')) return BADGE_STYLES['DISCOVER'];
    if (eventStr.includes('OPTION82')) return BADGE_STYLES['OPTION82'];
    if (eventStr.includes('OFFER')) return BADGE_STYLES['OFFER'];
    if (eventStr.includes('REQUEST')) return BADGE_STYLES['REQUEST'];
    if (eventStr.includes('ACK') || eventStr.includes('IP_ASSIGNED')) return BADGE_STYLES['ACK'];
    return 'bg-gray-100 text-gray-700 border border-gray-200';
  };

  const getFeedBorder = (eventStr) => {
    if (!eventStr) return 'border-l-gray-300';
    if (eventStr.includes('DISCOVER')) return 'border-l-blue-500';
    if (eventStr.includes('OPTION82')) return 'border-l-amber-500';
    if (eventStr.includes('OFFER')) return 'border-l-purple-500';
    if (eventStr.includes('REQUEST')) return 'border-l-yellow-500';
    if (eventStr.includes('ACK') || eventStr.includes('IP_ASSIGNED')) return 'border-l-green-500';
    return 'border-l-gray-300';
  };

  const displayCount = events.filter(evt => 
    evt.event !== 'LEASE_RENEWED' && 
    evt.event !== 'LEASE_RELEASED' &&
    evt.event !== 'RELEASE_SENT' &&
    evt.event !== 'RELEASE'
  ).length;

  // Group events by XID
  const exchanges = [];
  let currentExchange = null;
  let exchangeCounter = 1;

  events.forEach(evt => {
    const isMessageType7 = evt.packet?.options?.some(opt => opt.name === 'message-type' && String(opt.value) === '7');
    if (evt.event === 'LEASE_RENEWED') {
      return;
    }
    if (evt.event === 'LEASE_RELEASED' || evt.event === 'RELEASE_SENT' || evt.event === 'RELEASE' || evt.packet?.dhcp_type === 'RELEASE' || isMessageType7) {
      // Push to a separate releases array, not into exchanges
      return;
    }
    const xid = evt.packet?.xid ?? evt.meta?.xid ?? null;
    const needsNewGroup = !currentExchange || (xid && xid !== currentExchange.xid);
    
    if (needsNewGroup) {
      currentExchange = {
        id: `exch_${exchangeCounter}`,
        exchangeNumber: exchangeCounter++,
        xid: xid,
        events: [],
        status: 'PARTIAL',
        startTime: evt.display_time || evt.timestamp,
        assignedIp: null,
        injected: false
      };
      exchanges.push(currentExchange);
    }
    
    currentExchange.events.push(evt);
    if (evt.event === 'ACK_SENT' || evt.event === 'IP_ASSIGNED') currentExchange.status = 'COMPLETE';
    if ((evt.event === 'ACK_SENT' || evt.event === 'IP_ASSIGNED') && evt.meta?.assigned_ip) currentExchange.assignedIp = evt.meta.assigned_ip;
    if (evt.meta?.injected) currentExchange.injected = true;
  });

  // We need a toggledExchanges state to manage expanded/collapsed exchanges
  const [toggledExchanges, setToggledExchanges] = React.useState(new Set());
  const toggleExchange = (id) => {
    setToggledExchanges(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <div style={{ display: 'flex', gap: '16px', width: '100%', height: 'calc(100vh - 130px)' }}>

      {/* LEFT COLUMN */}
      <div style={{ width: '38%', minWidth: '350px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>

        {/* Topology card */}
        <div className="glass-card p-5 flex justify-between items-center">
          <TopologyAnimation events={logicalSort(events)} isHexDump={isHexDump} />
        </div>

        {/* Exchange Steps card */}
        <div className="glass-card p-6 flex-1 flex flex-col">
          <h3 className="font-bold text-gray-800 text-lg mb-6 flex items-center gap-2">
            <span className="material-symbols-outlined text-[#d95c41]">swap_horiz</span>
            Exchange Steps
          </h3>

          {/* Vertical timeline */}
          <div className="relative flex-1 px-2">
            <div className="relative z-10">
              {[
                { key: 'DISCOVER', color: 'blue',   dot: 'bg-blue-500',    ring: 'border-blue-400/60',    glow: 'rgba(59,130,246,0.5)'   },
                { key: 'OFFER',    color: 'purple',  dot: 'bg-purple-500',  ring: 'border-purple-400/60',  glow: 'rgba(168,85,247,0.5)'   },
                { key: 'REQUEST',  color: 'amber',   dot: 'bg-amber-500',   ring: 'border-amber-400/60',   glow: 'rgba(245,158,11,0.5)'   },
                { key: 'ACK',      color: 'emerald', dot: 'bg-emerald-500', ring: 'border-emerald-400/60', glow: 'rgba(16,185,129,0.5)'   },
              ].map((step, idx) => {
                const isComplete = completedSteps.has(idx);
                const isActive = !isComplete && completedSteps.has(idx - 1);
                const eventMatch = getEventByKeyword(step.key);
                const isExpanded = expandedStep === step.key;
                const subtitles = ['Client → Broadcast','Relay → Client','Client → Broadcast','Relay → Client'];
                return (
                  <div key={step.key} className="relative pb-6">
                    {idx < 3 && (
                      <div style={{
                        position: 'absolute',
                        left: '31px',
                        top: '48px',
                        bottom: '0',
                        width: '2px',
                        background: 'linear-gradient(to bottom, #fdba74, #fed7aa)',
                        zIndex: 0
                      }} />
                    )}
                    <div 
                      className="group flex items-start w-full cursor-pointer transition-[background] duration-150 ease-in-out hover:bg-[rgba(0,0,0,0.06)] overflow-hidden" 
                      style={{ borderRadius: '8px', padding: '8px 12px', boxSizing: 'border-box' }}
                      onClick={() => eventMatch && setExpandedStep(isExpanded ? null : step.key)}
                    >
                      <div style={{ width: '40px', height: '40px', flexShrink: 0, position: 'relative', zIndex: 1 }}>
                        <div className={`absolute inset-0 rounded-full border ${step.ring} bg-white/70 backdrop-blur-md shadow-[inset_0_1px_3px_rgba(255,255,255,0.9)] flex items-center justify-center ${isActive ? 'animate-pulse' : ''}`}>
                          <div className={`w-2.5 h-2.5 rounded-full ${isComplete || isActive ? step.dot : 'bg-gray-300'}`}
                            style={isComplete || isActive ? {boxShadow: `0 0 8px ${step.glow}`} : {}} />
                        </div>
                      </div>
                      <div style={{ marginLeft: '16px', paddingTop: '4px', flex: 1, minWidth: 0 }}>
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className={`text-sm font-bold ${isComplete || isActive ? 'text-gray-800' : 'text-gray-400'}`}>DHCP <span data-tooltip={step.key}>{step.key}</span></h4>
                            <p className="text-xs text-gray-500 mt-0.5">{subtitles[idx]}</p>
                          </div>
                          {eventMatch && (
                            <span className={`material-symbols-outlined text-gray-400 text-[18px] transition-transform ${isExpanded ? 'rotate-180' : ''}`}>expand_more</span>
                          )}
                        </div>
                        <AnimatePresence>
                          {isExpanded && eventMatch && (
                            <motion.div initial={{height:0,opacity:0}} animate={{height:'auto',opacity:1}} exit={{height:0,opacity:0}} className="overflow-hidden w-full mt-2 cursor-default" onClick={e => e.stopPropagation()}>
                              <PacketDetailCard packet={eventMatch.packet} isHexDump={isHexDump} />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* LEASE ASSIGNED block */}
          <AnimatePresence>
            {events.some(e => e.packet?.dhcp_type === 'ACK' && e.from_node === 'server') && (
              <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} className="mt-6 pt-4 border-t border-gray-100 hover:bg-emerald-50/50 transition-colors rounded-xl p-2 -mx-2">
                <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                  <span className="material-symbols-outlined text-[16px]">dns</span>
                  Lease Assigned
                </div>
                <div className="text-4xl font-mono font-bold text-emerald-600 tracking-tight">
                  {(() => {
                    const lastAck = [...events].reverse().find(e => e.packet?.dhcp_type === 'ACK' && e.from_node === 'server');
                    return lastAck?.packet?.yiaddr || '—';
                  })()}
                </div>
                <span className="mt-2 inline-block px-3 py-1 rounded text-[10px] font-bold text-emerald-600 border border-emerald-300 bg-emerald-50"><span data-tooltip="BOUND">BOUND</span></span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* RIGHT COLUMN — Live Packet Feed */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }} className="glass-card bg-white/40">
        {/* Header */}
        <div className="h-16 border-b border-white/80 flex items-center justify-between px-6 flex-shrink-0 bg-white/40 rounded-t-[1.5rem]">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-blue-500">list_alt</span>
            <h3 className="font-bold text-gray-800">Live Packet Feed</h3>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={generateReport} disabled={displayCount === 0}
              className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900 hover:bg-white/60 px-3 py-1.5 rounded-lg transition-all cursor-pointer disabled:opacity-50">
              <span className="material-symbols-outlined text-[18px]">download</span> Report
            </button>
            <div className="bg-white/70 backdrop-blur px-3 py-1.5 rounded-full border border-white flex items-center gap-2 text-xs font-bold text-gray-700">
              <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
              {displayCount}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2 custom-scrollbar">
          {exchanges.length === 0 ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
              <span className="material-symbols-outlined text-4xl mb-2 opacity-50">wifi_tethering_off</span>
              <p className="font-body-md">No exchanges yet</p>
            </div>
          ) : (
            exchanges.map((exch, eIdx) => {
              const isLast = eIdx === exchanges.length - 1;
              const isManuallyToggled = toggledExchanges.has(exch.id);
              const isExpanded = isLast ? !isManuallyToggled : isManuallyToggled;
              const timeStr = exch.startTime ? new Date(exch.startTime).toLocaleTimeString([], {hour12: false}) : '';

              return (
                <div key={exch.id} className="flex flex-col gap-3">
                  <div 
                    onClick={() => toggleExchange(exch.id)}
                    className="flex items-center gap-3 w-full py-2 bg-transparent px-4 cursor-pointer hover:bg-[rgba(217,92,65,0.12)] transition-colors"
                  >
                    <span className="material-symbols-outlined text-[#d95c41] text-[18px]">
                      {isExpanded ? 'expand_more' : 'chevron_right'}
                    </span>
                    <span className="font-semibold text-[#d95c41] text-sm">Exchange #{exch.exchangeNumber}</span>
                    <span className="text-gray-400 text-xs px-2">•</span>
                    <span className="font-mono text-gray-600 text-xs tracking-wider"><span data-tooltip="xid">XID</span>: {exch.xid}</span>
                    <span className="text-gray-400 text-xs px-2">•</span>
                    <span className="text-gray-500 text-xs">{timeStr}</span>
                    {exch.injected && (
                      <span className="ml-auto bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded uppercase"><span data-tooltip="INJECTED">Injected</span></span>
                    )}
                    {exch.status === 'COMPLETE' && (
                      <span className="ml-auto bg-green-100/80 text-green-700 border border-green-200 text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                        {exch.assignedIp ? <><span data-tooltip="yiaddr">IP</span>: {exch.assignedIp}</> : 'Complete'}
                      </span>
                    )}
                  </div>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="flex flex-col gap-3 overflow-hidden pl-2"
                      >
                        {logicalSort(exch.events).map((evt, idx) => {
                          if (evt.event === 'OPTION82_INSERTED') return null;
                          
                          const hasOpt82 = (evt.event === 'DISCOVER_RECEIVED' || evt.event === 'REQUEST_RECEIVED') &&
                                           (evt.packet?.option82 != null || exch.events.some(e => e.event === 'OPTION82_INSERTED' && Math.abs((e.seq || 0) - (evt.seq || 0)) <= 2));

                          const isRowExpanded = expandedRows.has((evt.display_time || evt.timestamp) + idx);
                          let eTime = '';
                          try {
                            eTime = formatTime(evt.display_time || evt.timestamp);
                          } catch (e) {
                            eTime = String(evt.display_time || evt.timestamp || '');
                          }
                          
                          return (
                            <div key={idx} className={`glass-strip transition-all duration-200 ${isRowExpanded ? 'bg-white/60 border-white/90 shadow-md' : ''}`}>
                              <div 
                                data-tooltip-packet={evt.event}
                                className={`px-4 py-3 flex items-center justify-between text-sm cursor-pointer transition-colors duration-150 ease-in-out hover:bg-[rgba(0,0,0,0.04)] ${getFeedBorder(evt.event)}`}
                                onClick={() => toggleRow((evt.display_time || evt.timestamp) + idx)}
                              >
                                <div className="flex items-center gap-4 flex-1">
                                  <div className="w-20 font-mono text-xs text-gray-400 shrink-0">
                                    {eTime}
                                  </div>
                                  <div className="w-32 shrink-0 flex items-center gap-1">
                                    <span data-tooltip={evt.event} className={`px-2 py-0.5 rounded text-[10px] font-label-mono font-bold uppercase ${getBadgeStyle(evt.event)}`}>
                                      {evt.event ? evt.event.split('_')[0] : 'UNKNOWN'}
                                    </span>
                                    {hasOpt82 && (
                                      <span className="px-1.5 py-0.5 rounded text-[9px] font-label-mono font-bold bg-amber-100 text-amber-700 border border-amber-300" data-tooltip="Option 82 Injected">
                                        OPT82
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex-1 flex items-center gap-3 text-sm">
                                    <span className="font-medium text-gray-800"><span data-tooltip="xid">XID</span>: {evt.packet?.xid || 'N/A'}</span>
                                    <span className="font-semibold text-gray-700 w-16 text-right truncate" data-tooltip={evt.from_node === 'relay' ? 'relay agent' : undefined}>{evt.from_node || 'client'}</span>
                                    <span className="text-gray-400">→</span>
                                    {(() => {
                                      const displayToNode = (evt.from_node === 'client' && (evt.event === 'DISCOVER_SENT' || evt.event === 'REQUEST_SENT')) ? 'relay' : (evt.to_node || 'server');
                                      return (
                                        <span className="font-semibold text-gray-700 w-16 truncate" data-tooltip={displayToNode === 'relay' ? 'relay agent' : undefined}>{displayToNode}</span>
                                      );
                                    })()}
                                  </div>
                                  <div className="w-24 text-right">
                                    <span className="text-xs font-mono text-gray-400">
                                      {evt.packet ? JSON.stringify(evt.packet).length + 42 + 'B' : ''}
                                    </span>
                                  </div>
                                </div>
                                <span className={`material-symbols-outlined text-gray-400 ml-4 transition-transform duration-150 ease-in-out ${isRowExpanded ? 'rotate-180' : ''}`}>
                                  expand_more
                                </span>
                              </div>
                              <AnimatePresence>
                                {isRowExpanded && evt.packet && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0}}
                                    animate={{ height: 'auto', opacity: 1}}
                                    exit={{ height: 0, opacity: 0}}
                                    className="overflow-hidden ml-4 mr-2"
                                  >
                                    <PacketDetailCard packet={evt.packet} isHexDump={isHexDump} />
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })
          )}
          <div ref={feedEndRef} />
        </div>
      </div>

    </div>
  );
}
