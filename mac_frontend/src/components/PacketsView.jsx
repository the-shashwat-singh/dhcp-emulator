import React, { useState} from 'react';
import { ChevronDown, ChevronRight, Clock, Hash, ArrowRight} from 'lucide-react';

export default function PacketsView({ events}) {
 const [expanded, setExpanded] = useState({});

 const toggleExpand = (idx) => {
 setExpanded(prev => ({ ...prev, [idx]: !prev[idx]}));
};

 const getBadgeColor = (type) => {
 if (type.includes('DISCOVER')) return '#3b82f6';
 if (type.includes('OFFER')) return '#10b981';
 if (type.includes('REQUEST')) return '#f59e0b';
 if (type.includes('ACK')) return '#06b6d4';
 if (type.includes('OPTION82')) return '#f97316';
 return '#6b7280';
};

 return (
 <div className="flex flex-col gap-4 pb-10">
 <h2 className="text-2xl font-bold text-white mb-2">Session Packets</h2>
 {events.length === 0 ? (
 <div className="text-gray-500 italic">No packets in current session...</div>
 ) : (
 events.map((ev, idx) => {
 const isExpanded = expanded[idx];
 const color = getBadgeColor(ev.event);
 const time = new Date(ev.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit', fractionalSecondDigits: 3});
 const fromNode = ev.from_node?.toUpperCase() || 'UNKNOWN';
 const toNode = ev.to_node?.toUpperCase() || 'UNKNOWN';
 const xid = ev.meta?.xid || '-';
 
 return (
 <div 
 key={idx} 
 style={{
 background: 'rgba(255,255,255,0.05)',
 backdropFilter: 'blur(10px)',
 WebkitBackdropFilter: 'blur(10px)',
 border: '1px solid rgba(255,255,255,0.1)',
 boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
}}
 className="rounded-xl overflow-hidden transition-all duration-300"
 >
 {/* Header */}
 <div 
 className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/5 transition-colors"
 onClick={() => toggleExpand(idx)}
 >
 <div className="flex items-center gap-4">
 <div 
 className="px-3 py-1 rounded-full text-xs font-bold tracking-wider text-black"
 style={{ backgroundColor: color}}
 >
 {ev.event}
 </div>
 <div className="flex items-center gap-2 text-gray-400 text-sm">
 <Clock className="w-4 h-4" />
 <span>{time}</span>
 </div>
 <div className="flex items-center gap-2 text-gray-300 text-sm font-medium bg-black/40 px-3 py-1 rounded-md">
 <span>{fromNode}</span>
 <ArrowRight className="w-4 h-4 text-gray-500" />
 <span>{toNode}</span>
 </div>
 <div className="flex items-center gap-2 text-gray-400 text-sm">
 <Hash className="w-4 h-4" />
 <span className="font-mono">{xid}</span>
 </div>
 </div>
 <div>
 {isExpanded ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronRight className="w-5 h-5 text-gray-400" />}
 </div>
 </div>

 {/* Expandable Content */}
 {isExpanded && (
 <div className="p-4 pt-0 border-t border-white/10 mt-2">
 <div className="bg-[#0d1117] rounded-lg p-4 overflow-x-auto mt-4">
 <pre className="font-mono text-xs text-gray-300 whitespace-pre-wrap leading-relaxed">
 {JSON.stringify(ev.packet, null, 2)}
 </pre>
 </div>
 </div>
 )}
 </div>
 );
})
 )}
 </div>
 );
}
