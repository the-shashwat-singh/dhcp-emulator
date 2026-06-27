import React from 'react';
import { decodePacket} from '../utils/dhcpDecoder';
import { Info, AlertCircle} from 'lucide-react';

export default function PacketDetail({ packet, isHexDump}) {
 if (!packet) {
 return (
 <div className="h-full flex items-center justify-center text-gray-500 text-sm">
 Select a packet from the Live Log to view details.
 </div>
 );
}

 const sections = decodePacket(packet);

 return (
 <div className="flex flex-col gap-4">
 
 {/* Top Stat Row */}
 <div className="grid grid-cols-3 gap-2">
 <div className="bg-black border border-gray-800 rounded-lg p-3 flex flex-col">
 <span className="text-[10px] text-secondary uppercase">Size</span>
 <span className="font-mono text-sm text-white">{packet.size_bytes} bytes</span>
 </div>
 <div className="bg-black border border-gray-800 rounded-lg p-3 flex flex-col">
 <span className="text-[10px] text-secondary uppercase"><span data-tooltip="xid">XID</span></span>
 <span className="font-mono text-sm text-active">{packet.xid}</span>
 </div>
 <div className="bg-black border border-gray-800 rounded-lg p-3 flex flex-col">
 <span className="text-[10px] text-secondary uppercase">Type</span>
 <span className="font-mono text-sm text-white">{packet.dhcp_type}</span>
 </div>
 </div>

 {/* Option 82 Highlight */}
 {packet.option82 && (
 <div className="bg-amber-900/20 border border-amber-500/50 rounded-lg p-4">
 <div className="flex items-center gap-2 text-amber-500 font-bold mb-2 text-sm">
 <AlertCircle className="w-4 h-4" /> Option 82 (<span data-tooltip="relay agent">Relay Agent</span> Info) Present
 </div>
 <div className="grid grid-cols-2 gap-4 font-mono text-xs">
 <div>
 <span className="text-gray-400 block text-[10px]">Circuit ID</span>
 <span className="text-amber-100">{packet.option82.circuit_id}</span>
 </div>
 <div>
 <span className="text-gray-400 block text-[10px]">Remote ID (MAC)</span>
 <span className="text-amber-100">{packet.option82.remote_id}</span>
 </div>
 </div>
 </div>
 )}

 {/* Accordions */}
 <div className="flex flex-col gap-2">
 {sections.map((section, idx) => (
 <details key={idx} className="group bg-black border border-gray-800 rounded-lg" open={idx === 3 || idx === 4}>
 <summary className="px-4 py-3 text-sm font-semibold cursor-pointer hover:text-active transition-colors select-none">
 ▶ {section.title}
 </summary>
 <div className="px-4 pb-4 pt-1 border-t border-gray-800/50">
 {section.isTable ? (
 <table className="w-full text-xs font-mono text-left">
 <thead>
 <tr className="text-gray-500 border-b border-gray-800">
 <th className="pb-2 font-normal">Code</th>
 <th className="pb-2 font-normal">Name</th>
 <th className="pb-2 font-normal">Value</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-800/50">
 {section.fields.map((opt, i) => (
 <tr key={i} className="text-gray-300">
 <td className="py-2 text-gray-500">{opt.code}</td>
 <td className="py-2 text-active">{opt.name}</td>
 <td className="py-2 break-all">{opt.value}</td>
 </tr>
 ))}
 </tbody>
 </table>
 ) : (
 <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs font-mono">
 {section.fields.map((field, i) => (
 <React.Fragment key={i}>
 <div className="text-gray-500">{field.name}</div>
 <div className="text-gray-200">{field.value}</div>
 </React.Fragment>
 ))}
 </div>
 )}
 
 {isHexDump && (
  <div style={{
    background: 'rgba(0, 0, 0, 0.06)',
    border: '1px solid rgba(0, 0, 0, 0.08)',
    borderRadius: '8px',
    color: '#2d2d2d',
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: '11.5px',
    padding: '12px 14px'
  }} className="mt-4 overflow-x-auto leading-relaxed">
  // RAW HEX DUMP PLACEHOLDER
  <br/>00 11 22 33 44 55 66 77 88 99 aa bb cc dd ee ff
  </div>
  )}
 </div>
 </details>
 ))}
 </div>
 </div>
 );
}
