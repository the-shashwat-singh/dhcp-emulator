import React, { useRef, useEffect, useState} from 'react';
import { motion, AnimatePresence} from 'framer-motion';
import PacketDetailCard from '../PacketDetailCard';
import { logicalSort, formatTime } from '../../utils/event_sorter';

export default function LogsView({ events}) {
 const scrollRef = useRef(null);
 const [expandedIndex, setExpandedIndex] = useState(null);

 useEffect(() => {
 if (scrollRef.current) {
 scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
}
}, [events]);

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
 if (!eventStr) return 'border-l-gray-500';
 if (eventStr.includes('DISCOVER')) return 'border-l-blue-500';
 if (eventStr.includes('OPTION82')) return 'border-l-amber-500';
 if (eventStr.includes('OFFER')) return 'border-l-purple-500';
 if (eventStr.includes('REQUEST')) return 'border-l-yellow-500';
 if (eventStr.includes('ACK') || eventStr.includes('IP_ASSIGNED')) return 'border-l-green-500';
 return 'border-l-gray-500';
};

 return (
 <div className="flex flex-col gap-6 h-[calc(100vh-140px)]">
 <header className="mb-2 flex justify-between items-end shrink-0">
 <div>
 <h2 className="font-headline-lg text-headline-lg text-on-background">Event Logs</h2>
 <p className="font-body-md text-body-md text-on-surface-variant mt-1">Live WebSocket feed (terminal mode).</p>
 </div>
 <button 
 onClick={() => window.location.reload()}
 className="flex items-center gap-2 px-4 py-2 bg-error/10 hover:bg-error/20 text-error rounded-lg font-label-mono transition-colors"
 >
 <span className="material-symbols-outlined text-[18px]">delete</span>
 Clear
 </button>
 </header>

 <div 
 ref={scrollRef}
 className="flex-1 bg-[#2d2926] rounded-2xl border border-outline-variant/30 p-4 overflow-y-auto font-label-mono text-xs shadow-inner custom-scrollbar relative"
 >
 {events.length === 0 ? (
 <div className="absolute inset-0 flex flex-col items-center justify-center text-[#f5f0ec]/40">
 <span className="material-symbols-outlined text-4xl mb-2 opacity-50">wifi_tethering</span>
 <p className="font-body-md">Awaiting packets on the wire...</p>
 </div>
 ) : (
 logicalSort(events).map((evt, idx) => {
 const isExpanded = expandedIndex === idx;
 const timeStr = formatTime(evt.display_time || evt.timestamp);

 return (
 <div key={idx} className="flex flex-col mb-2">
 <div 
 onClick={() => evt.packet && setExpandedIndex(isExpanded ? null : idx)}
 className={`flex items-start gap-4 p-2 hover:bg-white/5 rounded-lg cursor-pointer transition-colors border-l-2 ${getFeedBorder(evt.event)}`}
 >
 <span className="text-[#a1a1aa] shrink-0 font-mono mt-0.5">
 [{timeStr}]
 </span>
 
 <span className={`px-2 py-0.5 rounded text-[10px] font-label-mono font-bold uppercase ${getBadgeStyle(evt.event)}`} data-tooltip={evt.event.split('_')[0]}>
 {evt.event.split('_')[0]}
 </span>
 
 <span className="text-[#e4e4e7] flex items-center gap-2 flex-1">
 <span className="opacity-80">{evt.from_node || 'Client'}</span>
 <span className="material-symbols-outlined text-[14px] text-outline-variant/50">arrow_forward</span>
 <span className="opacity-80" data-tooltip={evt.to_node ? undefined : 'broadcast'}>{evt.to_node || 'Broadcast'}</span>
 
 {evt.packet?.xid && (
 <span className="text-[#71717a] ml-4 text-[10px]">
 <span data-tooltip="xid">XID</span>: {evt.packet.xid}
 </span>
 )}
 </span>

 {evt.packet && (
 <span className="material-symbols-outlined text-[#71717a] shrink-0 transition-transform">
 {isExpanded ? 'expand_less' : 'expand_more'}
 </span>
 )}
 </div>

 <AnimatePresence>
 {isExpanded && evt.packet && (
 <motion.div
 initial={{ height: 0, opacity: 0}}
 animate={{ height: 'auto', opacity: 1}}
 exit={{ height: 0, opacity: 0}}
 className="overflow-hidden ml-6 mr-2"
 >
 <div className="my-2">
 <PacketDetailCard packet={evt.packet} isHexDump={true} />
 </div>
 </motion.div>
 )}
 </AnimatePresence>
 </div>
 );
})
 )}
 </div>
 </div>
 );
}
