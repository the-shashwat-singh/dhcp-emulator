import React, { createContext, useContext, useState, useCallback, type ReactNode} from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastMessage {
 id: string;
 message: string;
 type: ToastType;
 duration?: number;
}

interface ToastContextType {
 toasts: ToastMessage[];
 addToast: (toast: Omit<ToastMessage, 'id'>) => void;
 removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: ReactNode}> = ({ children}) => {
 const [toasts, setToasts] = useState<ToastMessage[]>([]);

 const addToast = useCallback((toast: Omit<ToastMessage, 'id'>) => {
 const id = Math.random().toString(36).substring(2, 9);
 setToasts(prev => {
 const newToasts = [...prev, { ...toast, id, duration: toast.duration || 4000}];
 // Max 3 toasts
 if (newToasts.length > 3) {
 return newToasts.slice(newToasts.length - 3);
}
 return newToasts;
});
}, []);

 const removeToast = useCallback((id: string) => {
 setToasts(prev => prev.filter(t => t.id !== id));
}, []);

 return (
 <ToastContext.Provider value={{ toasts, addToast, removeToast}}>
 {children}
 </ToastContext.Provider>
 );
};

export const useToast = () => {
 const context = useContext(ToastContext);
 if (!context) throw new Error('useToast must be used within ToastProvider');
 return context;
};
