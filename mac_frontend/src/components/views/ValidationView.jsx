import React from 'react';

export default function ValidationView({ events }) {
  // Group events by XID into exchanges
  const exchangeMap = {};
  events.forEach(evt => {
    const xid = evt.packet?.xid ?? evt.meta?.xid ?? null;
    if (!xid) return;
    if (!exchangeMap[xid]) exchangeMap[xid] = [];
    exchangeMap[xid].push(evt);
  });

  // Pick the most recently completed exchange (has an ACK with message-type 5)
  const completedExchanges = Object.values(exchangeMap).filter(evts =>
    evts.some(e => e.packet?.options?.some(o => o.name === 'message-type' && o.value == 5))
  );

  // Use the last completed one
  const validationEvents = completedExchanges.length > 0 
    ? completedExchanges[completedExchanges.length - 1]
    : [];

  const checks = [
    {
      id: 'magic_cookie',
      label: 'DHCP Magic Cookie',
      rule: 'Must be 99.130.83.99 in all BOOTP packets',
      test: (events) => events.some(e => e.packet?.magic_cookie === '99.130.83.99')
    },
    {
      id: 'xid_consistency', 
      label: 'XID Consistency',
      rule: 'Transaction ID must match across all DORA messages',
      test: (events) => {
        const xids = events.map(e => e.packet?.xid).filter(Boolean);
        return xids.length > 0 && new Set(xids).size === 1;
      }
    },
    {
      id: 'client_starts_zero',
      label: 'Client Initial Address',
      rule: 'ciaddr must be 0.0.0.0 in DISCOVER',
      test: (events) => {
        const discover = events.find(e => e.packet?.dhcp_type === 'DISCOVER' && e.from_node === 'client');
        return discover?.packet?.ciaddr === '0.0.0.0';
      }
    },
    {
      id: 'src_ip_zero',
      label: 'Client Source IP Before Assignment',
      rule: 'src_ip must be 0.0.0.0 in DISCOVER and REQUEST',
      test: (events) => {
        const clientPkts = events.filter(e => 
          e.from_node === 'client' && 
          ['DISCOVER','REQUEST'].includes(e.packet?.dhcp_type)
        );
        return clientPkts.length > 0 && clientPkts.every(e => e.packet?.src_ip === '0.0.0.0');
      }
    },
    {
      id: 'option82_present',
      label: 'Option 82 Present',
      rule: 'Relay must inject Option 82 on all forwarded packets',
      test: (events) => events.some(e => e.packet?.option82)
    },
    {
      id: 'circuit_id',
      label: 'Option 82 Circuit ID',
      rule: 'circuit_id must equal enp0s1',
      test: (events) => {
        const o82 = events.find(e => e.packet?.option82);
        return o82?.packet?.option82?.circuit_id === 'enp0s1';
      }
    },
    {
      id: 'remote_id',
      label: 'Option 82 Remote ID',
      rule: 'remote_id must equal relay MAC',
      test: (events) => {
        const relayPkt = events.find(e => e.from_node === 'relay' && e.to_node === 'server');
        const relayMac = relayPkt?.packet?.src_mac;
        const o82 = events.find(e => e.packet?.option82);
        return relayMac && o82?.packet?.option82?.remote_id === relayMac;
      }
    },
    {
      id: 'giaddr_set',
      label: 'GIADDR Set by Relay',
      rule: 'giaddr must equal relay IP (192.168.128.20) on forwarded packets',
      test: (events) => {
        const relayFwd = events.find(e => e.from_node === 'relay' && e.to_node === 'server');
        return relayFwd?.packet?.giaddr === '192.168.128.20';
      }
    },
    {
      id: 'hops_incremented',
      label: 'Hops Incremented by Relay',
      rule: 'hops must be 1 on relay-forwarded packets',
      test: (events) => {
        const relayFwd = events.find(e => e.from_node === 'relay' && e.to_node === 'server');
        return relayFwd?.packet?.hops === 1;
      }
    },
    {
      id: 'udp_ports',
      label: 'UDP Port Directions',
      rule: 'Client sends from 68→67, server responds 67→68',
      test: (events) => {
        const clientPkt = events.find(e => e.from_node === 'client' && e.packet?.src_port);
        const serverPkt = events.find(e => e.from_node === 'server' && e.packet?.src_port);
        return clientPkt?.packet?.src_port === 68 && serverPkt?.packet?.src_port === 67;
      }
    },
    {
      id: 'lease_time',
      label: 'Lease Time Present',
      rule: 'ACK must include lease_time > 0',
      test: (events) => {
        const ack = events.find(e => e.packet?.options?.some(o => o.name === 'message-type' && o.value == 5));
        const leaseOpt = ack?.packet?.options?.find(o => o.name === 'lease_time');
        return leaseOpt && parseInt(leaseOpt.value) > 0;
      }
    },
    {
      id: 'yiaddr_assigned',
      label: 'IP Address Assigned',
      rule: 'yiaddr in OFFER and ACK must be a valid pool address (192.168.128.100-200)',
      test: (events) => {
        const offer = events.find(e => e.packet?.options?.some(o => o.name === 'message-type' && o.value == 2));
        const ip = offer?.packet?.yiaddr;
        if (!ip) return false;
        const last = parseInt(ip.split('.')[3]);
        return last >= 100 && last <= 200;
      }
    },
    {
      id: 'xid_in_offer',
      label: 'XID Echoed in OFFER',
      rule: 'Server must echo client XID in OFFER',
      test: (events) => {
        const discover = events.find(e => e.packet?.dhcp_type === 'DISCOVER');
        const offer = events.find(e => e.packet?.options?.some(o => o.name === 'message-type' && o.value == 2));
        return discover && offer && discover.packet?.xid === offer.packet?.xid;
      }
    },
    {
      id: 'broadcast_flag',
      label: 'Broadcast Flag',
      rule: 'DISCOVER and REQUEST must have flags=0x8000 (broadcast)',
      test: (events) => {
        const clientPkts = events.filter(e => 
          e.from_node === 'client' && 
          ['DISCOVER','REQUEST'].includes(e.packet?.dhcp_type)
        );
        return clientPkts.length > 0 && clientPkts.every(e => e.packet?.flags === '0x8000' || e.packet?.flags === 32768);
      }
    }
  ];

  if (!validationEvents || validationEvents.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center h-full">
        <div className="text-gray-500 font-label-mono uppercase tracking-wider text-sm">
          Run an exchange first to validate
        </div>
      </div>
    );
  }

  const results = checks.map(c => ({ ...c, passed: c.test(validationEvents) }));
  const passedCount = results.filter(r => r.passed).length;
  
  const clientChecks = ['client_starts_zero', 'src_ip_zero', 'udp_ports', 'broadcast_flag'];
  const relayChecks = ['option82_present', 'circuit_id', 'remote_id', 'giaddr_set', 'hops_incremented'];
  const serverChecks = ['magic_cookie', 'xid_consistency', 'lease_time', 'yiaddr_assigned', 'xid_in_offer'];

  const getSection = (ids) => results.filter(r => ids.includes(r.id));

  const exportReport = () => {
    const xid = validationEvents[0]?.packet?.xid || 'N/A';
    const ipAssigned = validationEvents.find(e => e.event === 'IP_ASSIGNED')?.meta?.assigned_ip || 'N/A';
    
    const report = {
      timestamp: new Date().toISOString(),
      xid,
      assigned_ip: ipAssigned,
      total_checks: checks.length,
      passed_checks: passedCount,
      results: results.map(r => ({ id: r.id, label: r.label, passed: r.passed }))
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dhcp_validation_${xid}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const renderSection = (title, checkList) => (
    <div className="mb-6">
      <h3 className="font-bold text-gray-800 mb-3 ml-2 uppercase text-xs tracking-wider">{title}</h3>
      <div className="flex flex-col gap-2">
        {checkList.map(check => (
          <div key={check.id} className="glass-strip bg-white/40 border border-white/60 p-3 rounded-xl flex items-center justify-between">
            <div>
              <div className="font-bold text-gray-900 text-sm">{check.label}</div>
              <div className="text-xs text-gray-500 mt-0.5">{check.rule}</div>
            </div>
            <div>
              {check.passed ? (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 border border-green-200">✅ PASS</span>
              ) : (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200">❌ FAIL</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-white/20 rounded-2xl p-6 overflow-y-auto custom-scrollbar shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-orange-100/80 flex items-center justify-center text-orange-600 shadow-sm border border-orange-200">
            <span className="material-symbols-outlined">gpp_good</span>
          </div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">RFC Compliance Validator</h2>
        </div>
        <button 
          onClick={exportReport}
          className="flex items-center gap-2 px-4 py-2 bg-white/60 hover:bg-white border border-white/80 rounded-xl text-sm font-bold text-gray-700 transition-colors shadow-sm"
        >
          <span className="material-symbols-outlined text-[18px]">download</span>
          Export Validation Report
        </button>
      </div>

      <div className="bg-white/60 border border-white/80 p-4 rounded-2xl mb-8 flex flex-col gap-3">
        <div className="flex justify-between items-end">
          <span className="text-sm font-bold text-gray-600 uppercase tracking-wider">Validation Score</span>
          <span className="text-2xl font-black text-gray-800">{passedCount} / {checks.length} Checks Passed</span>
        </div>
        <div className="h-3 w-full bg-gray-200 rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all duration-500 ${passedCount === checks.length ? 'bg-green-500' : 'bg-orange-500'}`}
            style={{ width: `${(passedCount / checks.length) * 100}%` }}
          />
        </div>
      </div>

      {renderSection('Client Behavior', getSection(clientChecks))}
      {renderSection('Relay Agent (RFC 3046)', getSection(relayChecks))}
      {renderSection('Server Behavior', getSection(serverChecks))}
    </div>
  );
}
