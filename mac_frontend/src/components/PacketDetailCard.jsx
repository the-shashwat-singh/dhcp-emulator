import React from 'react';

export default function PacketDetailCard({ packet, isHexDump }) {
 if (!packet) return <div className="text-on-surface-variant italic">No packet data available.</div>;

 let option82Data = packet.option82;
 if (!option82Data && packet.options) {
 const opt82 = packet.options.find(o => o.code === 82 || String(o.name).toLowerCase().includes('relay'));
 if (opt82) {
 option82Data = { raw: opt82.value, circuit_id: 'N/A', remote_id: 'N/A'};
 try {
 const hex = String(opt82.value).replace(/[^0-9a-fA-F]/g, '');
 if (hex.length > 0 && hex.length % 2 === 0) {
 let idx = 0;
 while (idx < hex.length) {
 const subopt = parseInt(hex.substring(idx, idx+2), 16);
 const length = parseInt(hex.substring(idx+2, idx+4), 16);
 const dataHex = hex.substring(idx+4, idx+4 + length*2);
 if (subopt === 1) {
 let cid = '';
 for(let i=0; i<dataHex.length; i+=2) cid += String.fromCharCode(parseInt(dataHex.substring(i, i+2), 16));
 option82Data.circuit_id = cid || dataHex;
} else if (subopt === 2) {
 let rid = '';
 for(let i=0; i<dataHex.length; i+=2) rid += dataHex.substring(i, i+2) + (i < dataHex.length-2 ? ':' : '');
 option82Data.remote_id = rid || dataHex;
}
 idx += 4 + length*2;
}
} else {
 option82Data.circuit_id = String(opt82.value);
}
} catch (e) {
 option82Data.circuit_id = String(opt82.value);
}
}
}

  const formatMessageType = (val) => {
    switch (String(val)) {
      case '1': return '1 (DHCP Discover)';
      case '2': return '2 (DHCP Offer)';
      case '3': return '3 (DHCP Request)';
      case '5': return '5 (DHCP ACK)';
      case '6': return '6 (DHCP NAK)';
      default: return String(val);
    }
  };

  const getEventBadge = () => {
    let type = 'UNKNOWN';
    if (packet.dhcp_type) type = packet.dhcp_type;
    else if (packet.options) {
      const mt = packet.options.find(o => o.code === 53 || o.name === 'message-type');
      if (mt) {
        if (String(mt.value) === '1') type = 'DISCOVER';
        if (String(mt.value) === '2') type = 'OFFER';
        if (String(mt.value) === '3') type = 'REQUEST';
        if (String(mt.value) === '5') type = 'ACK';
        if (String(mt.value) === '6') type = 'NAK';
      }
    }
    return type;
  };

  return (
    <div 
      className="mt-2"
      style={{
        background: 'rgba(255, 255, 255, 0.7)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        border: '1px solid rgba(255, 255, 255, 0.5)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.05)',
        borderRadius: '16px',
        width: '100%',
        overflowX: 'hidden'
      }}
    >
      <div className="flex justify-between items-center mb-4">
        <span className="px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-amber-100 text-amber-700">
          {getEventBadge()}
        </span>
        <span className="text-gray-500 bg-white/40 px-4 py-2 rounded-full border border-gray-200 text-[11px] font-mono">
          SIZE: <span className="text-[12px] font-medium text-gray-800">{packet.size_bytes || packet.size || 'N/A'}</span> bytes | <span data-tooltip="xid">XID</span>: <span className="text-[12px] font-medium text-gray-800">{packet.xid || 'N/A'}</span>
        </span>
      </div>

      <div className="space-y-4">
        {/* Ethernet */}
        <div>
          <div className="text-[11px] uppercase tracking-wide font-semibold text-[#007ea2] mb-1 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#007ea2]"></span> <span data-tooltip="BOOTP">ETHERNET FRAME</span>
          </div>
          <div className="pl-3.5 flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-gray-400 uppercase w-16" data-tooltip="chaddr">src</span> 
              <span className="font-mono text-[14px] font-medium text-gray-900">{packet.src_mac || 'N/A'}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-gray-400 uppercase w-16" data-tooltip="broadcast">dst</span> 
              <span className="font-mono text-[14px] font-medium text-gray-900">{packet.dst_mac || 'N/A'}</span>
            </div>
          </div>
        </div>

        {/* IP */}
        <div>
          <div className="text-[11px] uppercase tracking-wide font-semibold text-[#0058bc] mb-1 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#0058bc]"></span> IP HEADER
          </div>
          <div className="pl-3.5 flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-gray-400 uppercase w-16" data-tooltip="ciaddr">src</span> 
              <span className="font-mono text-[14px] font-medium text-gray-900">{packet.src_ip || 'N/A'}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-gray-400 uppercase w-16" data-tooltip="broadcast">dst</span> 
              <span className="font-mono text-[14px] font-medium text-gray-900">{packet.dst_ip || 'N/A'}</span>
            </div>
          </div>
        </div>

        {/* UDP */}
        <div>
          <div className="text-[11px] uppercase tracking-wide font-semibold text-[#059669] mb-1 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#059669]"></span> UDP HEADER
          </div>
          <div className="pl-3.5 flex gap-6">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-gray-400 uppercase" data-tooltip="Port 68">src_port</span> 
              <span className="font-mono text-[14px] font-medium text-gray-900">{packet.src_port || 'N/A'}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-gray-400 uppercase" data-tooltip="Port 67">dst_port</span> 
              <span className="font-mono text-[14px] font-medium text-gray-900">{packet.dst_port || 'N/A'}</span>
            </div>
          </div>
        </div>

        {/* BOOTP */}
        <div>
          <div className="text-[11px] uppercase tracking-wide font-semibold text-[#d97706] mb-1 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#d97706]"></span> <span data-tooltip="BOOTP">BOOTP FIELDS</span>
          </div>
          <div className="bg-white/30 p-4 rounded-lg border border-white/50 grid grid-cols-2 gap-y-2 gap-x-4">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-gray-400 uppercase w-16" data-tooltip="op">op</span> 
              <span className="font-mono text-[14px] font-medium text-gray-900">{packet.op || (packet.dhcp_type === 'DISCOVER' || packet.dhcp_type === 'REQUEST' ? '1 (Request)' : '2 (Reply)')}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-gray-400 uppercase w-16" data-tooltip="hops">hops</span> 
              <span className="font-mono text-[14px] font-medium text-gray-900">{packet.hops || '0'}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-gray-400 uppercase w-16" data-tooltip="ciaddr">ciaddr</span> 
              <span className="font-mono text-[14px] font-medium text-gray-900">{packet.ciaddr || '0.0.0.0'}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-gray-400 uppercase w-16" data-tooltip="yiaddr">yiaddr</span> 
              <span className="font-mono text-[14px] font-medium text-gray-900">{packet.yiaddr || '0.0.0.0'}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-gray-400 uppercase w-16" data-tooltip="giaddr">giaddr</span> 
              <span className="font-mono text-[14px] font-medium text-gray-900">{packet.giaddr || '0.0.0.0'}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-gray-400 uppercase w-16" data-tooltip="chaddr">chaddr</span> 
              <span className="font-mono text-[14px] font-medium text-gray-900">{packet.chaddr || packet.src_mac || 'N/A'}</span>
            </div>
          </div>
        </div>

        {/* DHCP Options */}
        {packet.options && packet.options.length > 0 && (
          <div>
            <div className="text-[11px] uppercase tracking-wide font-semibold text-[#6462ec] mb-1 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#6462ec]"></span> <span data-tooltip="OPTION82">DHCP OPTIONS</span>
            </div>
            <style>{`
              .dhcp-options-table table {
                width: 100%;
                table-layout: fixed;
                border-collapse: collapse;
              }
              .dhcp-options-table th:nth-child(1), .dhcp-options-table td:nth-child(1) { width: 25%; }
              .dhcp-options-table th:nth-child(2), .dhcp-options-table td:nth-child(2) { width: 35%; }
              .dhcp-options-table th:nth-child(3), .dhcp-options-table td:nth-child(3) { width: 40%; }
              .dhcp-options-table td {
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
                padding: 4px 8px;
              }
            `}</style>
            <div className="border border-gray-200 rounded-lg overflow-hidden bg-white/50 dhcp-options-table">
              <table>
                <thead className="bg-gray-50/50 text-[11px] text-gray-500 uppercase">
                  <tr>
                    <th className="font-medium py-2 px-3">Code</th>
                    <th className="font-medium py-2 px-3">Name</th>
                    <th className="font-medium py-2 px-3">Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {packet.options.map((opt, i) => {
                    const isHighlight = opt.name === 'message-type' || opt.name === 'client_id' || opt.code === 53 || opt.code === 61;
                    return (
                      <tr key={i} className={`${isHighlight ? 'bg-amber-50/50 border-l-2 border-l-amber-400' : 'even:bg-white/40 border-l-2 border-l-transparent'}`}>
                        <td className="text-[14px] text-gray-500 font-mono">{opt.code || '-'}</td>
                        <td className={`text-[14px] ${isHighlight ? 'text-amber-800 font-medium' : 'text-gray-700'}`}>
                          <span data-tooltip={opt.name === 'message-type' ? getEventBadge() : (['param_req_list', 'hostname', 'client_id'].includes(opt.name) ? opt.name : undefined)}>
                            {opt.name}
                          </span>
                        </td>
                        <td className="font-mono text-[14px] text-gray-900" title={String(opt.value)}>
                          {(opt.name === 'message-type' || opt.code === 53) ? formatMessageType(opt.value) : String(opt.value)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Option 82 Dedicated Section */}
        {option82Data && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-2">
            <div className="text-amber-700 text-[11px] font-semibold uppercase tracking-wide flex items-center gap-1 mb-2">
              <span className="material-symbols-outlined text-[14px]">alt_route</span>
              <span data-tooltip="relay agent">Relay Agent</span> Information (Option 82)
            </div>
            <div className="grid grid-cols-1 gap-2 pl-5">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono text-amber-700/70 uppercase">Circuit ID:</span> 
                <span className="font-mono text-[14px] font-medium text-amber-900">{option82Data.circuit_id || 'N/A'}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono text-amber-700/70 uppercase">Remote ID:</span> 
                <span className="font-mono text-[14px] font-medium text-amber-900">{option82Data.remote_id || 'N/A'}</span>
              </div>
            </div>
          </div>
        )}

        {/* Hex Dump Panel */}
        {isHexDump && (
          <div className="mt-4 border-t border-gray-100 pt-3">
            <div className="text-[11px] uppercase tracking-wide font-semibold text-gray-500 mb-2 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[14px]">data_object</span>
              RAW BYTE DUMP (HEX)
            </div>
            <pre style={{
              background: 'rgba(0, 0, 0, 0.06)',
              border: '1px solid rgba(0, 0, 0, 0.08)',
              borderRadius: '8px',
              color: '#2d2d2d',
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '11.5px',
              padding: '12px 14px'
            }} className="overflow-x-auto leading-relaxed">
{`0000   ff ff ff ff ff ff 82 f5 87 05 94 e9 08 00 45 00  ..............E.
0010   01 48 00 00 40 00 40 11 39 86 00 00 00 00 ff ff  .H..@.@.9.......
0020   ff ff 00 44 00 43 01 34 a0 c1 01 01 06 00 4a 2d  ...D.C.4......J-
0030   ea 6d 00 00 00 00 00 00 00 00 00 00 00 00 00 00  .m..............
0040   00 00 00 00 00 00 82 f5 87 05 94 e9 00 00 00 00  ................`}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
