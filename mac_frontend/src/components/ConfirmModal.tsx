
import { motion, AnimatePresence} from 'framer-motion';

interface ConfirmModalProps {
 isOpen: boolean;
 onClose: () => void;
 onConfirm: () => void;
}

export default function ConfirmModal({ isOpen, onClose, onConfirm}: ConfirmModalProps) {
 return (
 <AnimatePresence>
 {isOpen && (
 <div className="fixed inset-0 z-[200] flex items-center justify-center">
 <motion.div 
 initial={{ opacity: 0}} 
 animate={{ opacity: 1}} 
 exit={{ opacity: 0}}
 className="absolute inset-0 bg-black/40 backdrop-blur-sm"
 onClick={onClose}
 />
 <motion.div 
 initial={{ scale: 0.9, opacity: 0}}
 animate={{ scale: 1, opacity: 1}}
 exit={{ scale: 0.9, opacity: 0}}
 transition={{ type: 'spring', damping: 25, stiffness: 400}}
 className="glass-panel relative z-10 p-8 rounded-3xl max-w-md w-full shadow-2xl mx-4"
 >
 <div className="w-14 h-14 rounded-full bg-error/10 text-error flex items-center justify-center mb-6">
 <span className="material-symbols-outlined text-3xl">warning</span>
 </div>
 <h2 className="text-headline-md font-headline-md text-on-surface font-bold mb-2">Reset Exchange State?</h2>
 <p className="text-body-md font-body-md text-on-surface-variant mb-8 leading-relaxed">
 This will flush the client IP and reset all state. Are you sure you want to proceed?
 </p>
 <div className="flex gap-4 justify-end">
 <button 
 onClick={onClose}
 className="px-6 py-2.5 rounded-full font-label-mono text-label-mono font-semibold text-on-surface-variant hover:bg-surface-variant transition-colors"
 >
 Cancel
 </button>
 <button 
 onClick={() => { onConfirm(); onClose();}}
 className="px-6 py-2.5 rounded-full font-label-mono text-label-mono font-semibold bg-error text-white hover:bg-error/90 shadow-md transition-colors"
 >
 Reset
 </button>
 </div>
 </motion.div>
 </div>
 )}
 </AnimatePresence>
 );
}
