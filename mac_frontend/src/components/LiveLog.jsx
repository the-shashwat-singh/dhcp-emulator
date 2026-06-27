import React, { useRef, useEffect, useState} from 'react';
import { Terminal} from 'lucide-react';
import { motion, AnimatePresence} from 'framer-motion';
import PacketDetail from './PacketDetail';

export default function LiveLog({ events, isHexDump}) {
 const endRef = useRef(null);
 const [expanded, setExpanded] = useState({});

 useEffect(() => {
 endRef.current?.scrollIntoView({ behavior: 'smooth'});
}, [events]);

 const getBadgeColor = (type) => {
 if (type.includes("DISCOVER")) return "bg-blue-500/20 text-blue-400 border border-blue-500/30";
 if (type.includes("OFFER")) return "bg-purple-500/20 text-purple-400 border border-purple-500/30";
 if (type.includes("REQUEST")) return "bg-amber-500/20 text-amber-400 border border-amber-500/30";
 if (type.includes("ACK")) return "bg-success/20 text-success border border-success/30";
 if (type.includes("OPTION82")) return "bg-orange-500/20 text-orange-400 border border-orange-500/30";
 return "bg-gray-800 text-gray-400 border border-gray-700";
};

 const getBorderColor = (type) => {
 if (type.includes("DISCOVER")) return "border-l-blue-500";
 if (type.includes("OFFER")) return "border-l-purple-500";
 if (type.includes("REQUEST")) return "border-l-amber-500";
 if (type.includes("ACK")) return "border-l-emerald-500";
 if (type.includes("OPTION82")) return "border-l-orange-500";
 return "border-l-gray-600";
};

 if (events.length === 0) {
 return (
 <div className="h-full flex flex-col items-center justify-center text-gray-600">
 <Terminal className="w-12 h-12 mb-4 opacity-50" />
 <p className="text-sm">Waiting for packets...</p>
 </div>
 );
}

 const handleToggle = (index) => {
 setExpanded(prev => ({ ...prev, [index]: !prev[index]}));
};

 return (
 <div className="font-mono text-xs flex flex-col gap-2 relative">
 <AnimatePresence initial={false}>
 {events.map((ev, i) => {
 const isExpanded = !!expanded[i];
 return (
 <motion.div 
 key={i} 
 layout
 initial={{ opacity: 0, y: 10}}
 animate={{ opacity: 1, y: 0}}
 transition={{ duration: 0.2}}
 className={`flex flex-col rounded overflow-hidden cursor-pointer transition-colors border-l-4 ${getBorderColor(ev.event)} ${
 isExpanded 
 ? 'bg-black/80 border border-gray-700 my-2 shadow-lg shadow-black/50' 
 : 'bg-transparent border border-transparent hover:bg-gray-800/50 hover:border-gray-700'
}`}
 >
 <div 
 className="flex items-start gap-3 p-2"
 onClick={() => handleToggle(i)}
 >
 <span className="text-gray-500 whitespace-nowrap mt-0.5">
 {new Date(ev.timestamp).toISOString().split('T')[1].slice(0, -1)}
 </span>
 <div className="flex-1 flex flex-col gap-1">
 <div className="flex items-center gap-2">
 <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getBadgeColor(ev.event)}`}>
 {ev.event}
 </span>
 {(ev.from_node && ev.to_node) && (
 <span className="text-gray-300">
 {ev.from_node.toUpperCase()} → {ev.to_node.toUpperCase()}
 </span>
 )}
 </div>
 {ev.meta && ev.meta.xid && (
 <div className="text-gray-500">XID: {ev.meta.xid}</div>
 )}
 </div>
 </div>

 <AnimatePresence>
 {isExpanded && ev.packet && (
 <motion.div
 initial={{ height: 0, opacity: 0}}
 animate={{ height: "auto", opacity: 1}}
 exit={{ height: 0, opacity: 0}}
 transition={{ duration: 0.2, ease: "easeInOut"}}
 className="overflow-hidden border-t border-gray-800 bg-gray-900/30"
 >
 <div className="p-4 cursor-default" onClick={e => e.stopPropagation()}>
 <PacketDetail packet={ev.packet} isHexDump={isHexDump} />
 </div>
 </motion.div>
 )}
 </AnimatePresence>
 </motion.div>
 );
})}
 </AnimatePresence>
 <div ref={endRef} />
 </div>
 );
}
