import React from 'react';
import { motion} from 'framer-motion';

export default function IpCounter({ clientIp, meta, state}) {
 const isBound = (state === 'BOUND' || state === 'ACK') && clientIp !== '0.0.0.0';

 return (
 <div className="bg-panel border border-gray-800/50 rounded-xl p-8 flex flex-col justify-center relative overflow-hidden h-48">
 <h3 className="text-sm font-semibold text-secondary uppercase tracking-widest mb-4">
 IP Assignment
 </h3>
 
 <div className="flex flex-col">
 <motion.div 
 key={clientIp}
 initial={{ y: 20, opacity: 0}}
 animate={{ y: 0, opacity: 1}}
 className={`text-6xl font-mono tracking-tighter ${isBound ? 'text-success drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'text-gray-600'}`}
 >
 {clientIp}
 </motion.div>
 
 {isBound && meta && (
 <motion.div 
 initial={{ opacity: 0}}
 animate={{ opacity: 1}}
 transition={{ delay: 0.3}}
 className="mt-4 grid grid-cols-3 gap-4 text-xs font-mono text-gray-400"
 >
 <div>
 <span className="text-gray-600 block text-[10px] uppercase">Subnet</span>
 {meta.subnet || '255.255.255.0'}
 </div>
 <div>
 <span className="text-gray-600 block text-[10px] uppercase"><span data-tooltip="gateway">Gateway</span></span>
 {meta.router || '192.168.128.1'}
 </div>
 <div>
 <span className="text-gray-600 block text-[10px] uppercase">Lease Time</span>
 24 hours
 </div>
 </motion.div>
 )}
 </div>

 {isBound && (
 <motion.div 
 initial={{ x: '100%'}}
 animate={{ x: 0}}
 className="absolute top-0 right-0 bottom-0 w-1/3 bg-gradient-to-l from-success/20 to-transparent pointer-events-none"
 />
 )}
 </div>
 );
}
