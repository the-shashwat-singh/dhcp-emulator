import React, { useEffect, useState} from 'react';
import { Laptop, Router, Server} from 'lucide-react';
import { motion, AnimatePresence} from 'framer-motion';

export default function TopologyView({ events, state}) {
 const [activePackets, setActivePackets] = useState([]);

 useEffect(() => {
 if (events.length > 0) {
 const latestEvent = events[events.length - 1];
 const newPacket = {
 id: Date.now(),
 from: latestEvent.from_node,
 to: latestEvent.to_node,
 type: latestEvent.event,
};
 
 setActivePackets(prev => [...prev, newPacket]);
 
 // Remove packet animation after 1.5s
 setTimeout(() => {
 setActivePackets(prev => prev.filter(p => p.id !== newPacket.id));
}, 1500);
}
}, [events]);

 const getNodeColor = (nodeName) => {
 if (state === 'BOUND') return 'border-success text-success';
 if (state !== 'IDLE') {
 const isSending = events[events.length - 1]?.from_node === nodeName;
 if (isSending) return 'border-active text-active animate-pulse shadow-[0_0_15px_rgba(96,165,250,0.5)]';
}
 return 'border-gray-800 text-gray-400';
};

 const getPillColor = (type) => {
 if (type.includes("DISCOVER")) return "bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)]";
 if (type.includes("OFFER")) return "bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.8)]";
 if (type.includes("REQUEST")) return "bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.8)]";
 if (type.includes("ACK")) return "bg-success shadow-[0_0_10px_rgba(16,185,129,0.8)]";
 return "bg-gray-500";
};

 // Maps logical nodes to X positions (0% to 100%)
 const nodePositions = {
 client: 0,
 relay: 50,
 server: 100
};

 return (
 <div className="relative bg-panel border border-gray-800/50 rounded-xl p-8 flex flex-col items-center justify-center min-h-[300px] overflow-hidden">
 
 {/* Background ambient glow */}
 <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-900/20 via-black to-black pointer-events-none" />

 <h2 className="absolute top-4 left-4 text-sm font-semibold text-secondary uppercase tracking-widest z-10">
 Network Topology
 </h2>

 <div className="w-full max-w-2xl relative mt-8 z-10 flex justify-between items-center">
 
 {/* Connecting Lines */}
 <div className="absolute top-1/2 left-10 right-10 h-0.5 bg-gray-800 -translate-y-1/2 -z-10"></div>

 {/* Client Node */}
 <div className={`flex flex-col items-center p-4 border rounded-xl bg-black transition-all duration-300 ${getNodeColor('client')}`}>
 <Laptop className="w-8 h-8 mb-2" />
 <span className="text-xs font-bold">CLIENT</span>
 <span className="font-mono text-[10px] text-gray-500">enp0s1</span>
 </div>

 {/* Relay Node */}
 <div className={`flex flex-col items-center p-4 border rounded-xl bg-black transition-all duration-300 ${getNodeColor('relay')}`}>
 <Router className="w-8 h-8 mb-2" />
 <span className="text-xs font-bold"><span data-tooltip="relay agent">RELAY AGENT</span></span>
 <span className="font-mono text-[10px] text-gray-500">192.168.128.20</span>
 {events.some(e => e.event === "OPTION82_INSERTED") && (
 <motion.div 
 initial={{ scale: 0}} 
 animate={{ scale: 1}} 
 className="absolute -top-2 -right-2 bg-amber-500 text-black text-[9px] font-bold px-2 py-0.5 rounded-full"
 >
 Opt 82
 </motion.div>
 )}
 </div>

 {/* Server Node */}
 <div className={`flex flex-col items-center p-4 border rounded-xl bg-black transition-all duration-300 ${getNodeColor('server')}`}>
 <Server className="w-8 h-8 mb-2" />
 <span className="text-xs font-bold">DHCP SERVER</span>
 <span className="font-mono text-[10px] text-gray-500">192.168.128.10</span>
 </div>

 {/* Animated Packets */}
 <AnimatePresence>
 {activePackets.map((pkt) => {
 if (!pkt.from || !pkt.to) return null;
 const startX = nodePositions[pkt.from];
 const endX = nodePositions[pkt.to];
 
 return (
 <motion.div
 key={pkt.id}
 initial={{ left: `${startX}%`, opacity: 0}}
 animate={{ left: `${endX}%`, opacity: 1}}
 exit={{ opacity: 0}}
 transition={{ duration: 1.2, ease: "easeInOut"}}
 className={`absolute top-1/2 -translate-y-1/2 px-2 py-1 rounded-full text-[10px] font-bold text-white whitespace-nowrap -ml-4 ${getPillColor(pkt.type)}`}
 >
 {pkt.type.split('_')[0]}
 </motion.div>
 )
})}
 </AnimatePresence>

 </div>
 </div>
 );
}
