import React from 'react';
import { motion} from 'framer-motion';
import { Check} from 'lucide-react';

export default function DoraTracker({ state}) {
 const steps = [
 { id: 'D', name: 'DISCOVER', activeStates: ['DISCOVER']},
 { id: 'O', name: 'OFFER', activeStates: ['OFFER']},
 { id: 'R', name: 'REQUEST', activeStates: ['REQUEST']},
 { id: 'A', name: 'ACK', activeStates: ['ACK', 'BOUND']}
 ];

 const getCurrentStepIndex = () => {
 if (state === 'IDLE') return -1;
 if (state === 'BOUND' || state === 'ACK') return 4;
 return steps.findIndex(s => s.activeStates.includes(state));
};

 const currentIndex = getCurrentStepIndex();

 return (
 <div className="grid grid-cols-4 gap-4">
 {steps.map((step, idx) => {
 const isPast = currentIndex > idx || state === 'BOUND' || state === 'ACK';
 const isActive = currentIndex === idx && state !== 'BOUND' && state !== 'ACK';
 
 let borderClass = 'border-gray-800/50';
 let bgClass = 'bg-panel';
 let textClass = 'text-gray-500';

 if (isActive) {
 borderClass = 'border-active shadow-[0_0_10px_rgba(96,165,250,0.3)]';
 textClass = 'text-active';
} else if (isPast) {
 borderClass = 'border-success';
 textClass = 'text-success';
}

 return (
 <motion.div 
 key={step.id}
 animate={{ 
 scale: isActive ? 1.05 : 1,
 borderColor: isActive ? '#60A5FA' : isPast ? '#10B981' : 'rgba(31,41,55,0.5)'
}}
 className={`p-4 border rounded-xl flex flex-col items-center justify-center transition-colors duration-300 ${bgClass}`}
 >
 <div className={`text-2xl font-bold mb-1 ${textClass}`}>
 {isPast ? <Check className="w-8 h-8" /> : step.id}
 </div>
 <div className={`text-[10px] font-bold tracking-widest ${textClass}`}>
 {step.name}
 </div>
 </motion.div>
 );
})}
 </div>
 );
}
