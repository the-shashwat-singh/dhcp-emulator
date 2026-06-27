import { useEffect} from 'react';
import { motion, AnimatePresence} from 'framer-motion';
import { useToast, type ToastMessage} from '../context/ToastContext';

export default function ToastContainer() {
 const { toasts, removeToast} = useToast();

 return (
 <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
 <AnimatePresence>
 {toasts.map((toast) => (
 <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
 ))}
 </AnimatePresence>
 </div>
 );
}

function ToastItem({ toast, onRemove}: { toast: ToastMessage, onRemove: (id: string) => void}) {
 useEffect(() => {
 const timer = setTimeout(() => {
 onRemove(toast.id);
}, toast.duration);
 return () => clearTimeout(timer);
}, [toast, onRemove]);

 const getStyle = () => {
 switch (toast.type) {
 case 'success': return { icon: 'check_circle', color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)'};
 case 'error': return { icon: 'error', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)'};
 case 'warning': return { icon: 'warning', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)'};
 case 'info': default: return { icon: 'info', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)'};
}
};

 const style = getStyle();

 return (
 <motion.div
 initial={{ x: 100, opacity: 0, scale: 0.9}}
 animate={{ x: 0, opacity: 1, scale: 1}}
 exit={{ x: 100, opacity: 0, scale: 0.9}}
 transition={{ type: 'spring', stiffness: 400, damping: 25}}
 className="pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-2xl shadow-lg backdrop-blur-xl border font-body-md text-sm text-on-surface"
 style={{
 background: 'rgba(255,250,240,0.95)',
 borderColor: 'rgba(242,166,90,0.4)',
}}
 >
 <div 
 className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
 style={{ backgroundColor: style.bg, color: style.color}}
 >
 <span className="material-symbols-outlined text-[18px]">{style.icon}</span>
 </div>
 <div className="flex-1 min-w-[200px] text-gray-800 font-medium">
 {toast.message}
 </div>
 <button 
 onClick={() => onRemove(toast.id)}
 className="text-gray-400 hover:text-gray-600 transition-colors p-1"
 >
 <span className="material-symbols-outlined text-[18px]">close</span>
 </button>
 </motion.div>
 );
}
