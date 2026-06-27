import React, { useState, useEffect} from 'react';
import { useWebSocket} from '../hooks/useWebSocket';
import { useToast} from '../context/ToastContext';
import ConfirmModal from '../components/ConfirmModal';
import { motion, AnimatePresence } from 'framer-motion';
import TooltipProvider from '../components/TooltipProvider';
import Sidebar from '../components/Sidebar';
import DashboardActive from '../components/DashboardActive';
import DashboardSuccess from '../components/DashboardSuccess';
import NodesView from '../components/views/NodesView';
import PoolsView from '../components/views/PoolsView';
import ScopesView from '../components/views/ScopesView';
import LeasesView from '../components/views/LeasesView';
import LogsView from '../components/views/LogsView';
import PacketBuilderView from '../components/views/PacketBuilderView';
import ValidationView from '../components/views/ValidationView';

export default function Dashboard() {
 const { events, connected, globalState, setEvents} = useWebSocket('ws://localhost:8000/ws/events');
 const { addToast} = useToast();
 
 const [activeTab, setActiveTab] = useState('exchange');
 const [isHexDump, setIsHexDump] = useState(() => localStorage.getItem('isHexDump') === 'true');
 const [loading, setLoading] = useState(false);
 const [showResetModal, setShowResetModal] = useState(false);

 useEffect(() => {
 localStorage.setItem('isHexDump', String(isHexDump));
}, [isHexDump]);

 // Toast for IP assignment
 useEffect(() => {
 if (globalState.state === 'SUCCESS' && globalState.client_ip) {
 addToast({ message: `IP Assigned: ${globalState.client_ip}`, type: 'success', duration: 5000});
}
}, [globalState.state, globalState.client_ip, addToast]);



 const startExchange = async () => {
 setLoading(true);
 try {
 await fetch('http://localhost:8000/api/start', { method: 'POST'});
 addToast({ message: 'DHCP Exchange Started', type: 'info'});
} catch (e) {
 addToast({ message: 'Failed to connect to backend', type: 'error'});
} finally {
 setLoading(false);
}
};

 const executeReset = async () => {
 try {
 await fetch('http://localhost:8000/api/reset', { method: 'POST'});
 addToast({ message: 'Exchange Reset', type: 'warning'});
} catch (e) {
 addToast({ message: 'Failed to reset backend', type: 'error'});
}
};

  const clearBuffer = async () => {
  setEvents([]);
  try {
  await fetch('http://localhost:8000/api/clear-buffer', { method: 'POST'});
  addToast({ message: 'Buffer cleared', type: 'info'});
  } catch (e) {
  addToast({ message: 'Failed to clear server buffer', type: 'error'});
  }
  };

  const exportLogs = () => {
    const blob = new Blob([JSON.stringify(events, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dhcp_events_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

 const isSuccess = globalState.state === 'SUCCESS';

 return (
 <div className="bg-surface text-on-surface min-h-screen font-body-md overflow-x-hidden selection:bg-primary selection:text-on-primary">
 {/* Ambient Background */}
 <div className="fixed inset-0 pointer-events-none z-[-1] overflow-hidden">
 <div className="glow-blob-1 absolute top-[-20%] left-[-10%] w-[70vw] h-[70vw] rounded-full blur-[120px]" />
 <div className="glow-blob-2 absolute bottom-[-20%] right-[-10%] w-[60vw] h-[60vw] rounded-full blur-[100px]" />
 </div>

 <ConfirmModal 
 isOpen={showResetModal} 
 onClose={() => setShowResetModal(false)} 
 onConfirm={executeReset} 
 />

 {/* TopNavBar */}
 <nav className="flex justify-between items-center px-margin-page w-full fixed top-0 z-50 border-b border-white/20 bg-surface/80 backdrop-blur-2xl shadow-sm text-primary font-body-md text-body-md" style={{ height: '48px' }}>
 <div className="flex items-center gap-6 md:hidden">
 <div className="text-headline-md font-headline-md font-bold tracking-tight text-primary">DHCP.EMU</div>
 </div>
 <div className="hidden md:block"></div>
 <div className="flex items-center gap-4">

 <button 
 onClick={() => setIsHexDump(!isHexDump)}
 className={`px-4 py-2 rounded-full font-label-mono text-label-mono uppercase transition-colors active:scale-95 duration-200 ${isHexDump ? 'bg-warning text-on-warning' : 'bg-surface-variant text-on-surface-variant hover:bg-surface-variant/80'}`}
 >
 {isHexDump ? '⚡ Hex Dump' : 'Hex Dump'}
 </button>
 <button 
 onClick={() => setShowResetModal(true)}
 className="flex items-center gap-2 px-4 py-2 rounded-full bg-error/10 text-error hover:bg-error/20 font-label-mono text-label-mono uppercase transition-colors"
 title="Reset DHCP State"
 >
 <span className="material-symbols-outlined text-[18px]">refresh</span> Reset
 </button>
 <div className="w-10 h-10 rounded-full bg-surface-container-high border border-white/40 overflow-hidden shadow-sm flex items-center justify-center">
 <span className="material-symbols-outlined text-on-surface-variant">person</span>
 </div>
 </div>
 </nav>

 <Sidebar 
 activeTab={activeTab} 
 setActiveTab={setActiveTab} 
 loading={loading} 
 isSuccess={isSuccess} 
 startExchange={startExchange} 
 />

 {/* Main Content Area */}
 <main className="md:ml-64 flex flex-col gap-gutter" style={{ paddingTop: '68px', paddingLeft: '24px', paddingRight: '24px', paddingBottom: '16px', height: '100vh', overflow: 'hidden' }}>
 
 {/* Loading Skeleton if no events and not success */}
 {!connected && events.length === 0 ? (
 <div className="animate-pulse flex flex-col gap-8 mt-10">
 <div className="h-8 bg-surface-variant/50 w-1/4 rounded"></div>
 <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
 <div className="lg:col-span-3 bg-surface-variant/30 h-64 rounded-xl"></div>
 <div className="lg:col-span-9 bg-surface-variant/30 h-64 rounded-xl flex items-center justify-between px-10">
 <div className="w-16 h-16 rounded-full bg-surface-variant"></div>
 <div className="h-2 flex-1 bg-surface-variant/50 mx-4"></div>
 <div className="w-16 h-16 rounded-full bg-surface-variant"></div>
 <div className="h-2 flex-1 bg-surface-variant/50 mx-4"></div>
 <div className="w-16 h-16 rounded-full bg-surface-variant"></div>
 </div>
 </div>
 </div>
 ) : (
 <>
 {activeTab === 'exchange' && (
 isSuccess ? (
 <DashboardSuccess events={events} globalState={globalState} isHexDump={isHexDump} />
 ) : (
 <DashboardActive events={events} globalState={globalState} isHexDump={isHexDump} />
 )
 )}
 {activeTab === 'nodes' && <NodesView />}
 {activeTab === 'pools' && <PoolsView events={events} />}
 {activeTab === 'scopes' && <ScopesView />}
 {activeTab === 'leases' && <LeasesView events={events} />}
 {activeTab === 'validation' && <ValidationView events={events} />}
 {activeTab === 'logs' && <LogsView events={events} />}
 {activeTab === 'builder' && <PacketBuilderView setActiveTab={setActiveTab} />}
 </>
 )}

 </main>

 {/* Footer */}
 <footer className="fixed bottom-0 right-0 left-0 md:left-64 flex justify-between items-center px-margin-page py-2 z-30 bg-surface-dim/40 backdrop-blur-md border-t border-white/10 ">
 <div className="font-label-mono text-label-mono text-secondary flex items-center gap-2">
 <span className={`w-2 h-2 rounded-full ${connected ? 'bg-secondary animate-pulse' : 'bg-error'}`} />
 System Status: {connected ? 'Live' : 'Disconnected (Reconnecting...)'}
 </div>
 <div className="flex gap-6 font-label-mono text-label-mono">
 <button onClick={exportLogs} className="text-primary font-bold hover:underline transition-colors">Export Logs</button>
 <button onClick={clearBuffer} className="text-on-surface-variant/80 hover:text-primary transition-colors">Clear Buffer</button>
 </div>
 </footer>
 <TooltipProvider />
 </div>
 );
}
