import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DocumentationPanel from './DocumentationPanel';

export default function Sidebar({ 
 activeTab, 
 setActiveTab, 
 loading, 
 isSuccess, 
 startExchange 
}) {
 const tabs = [
 { id: 'exchange', icon: 'swap_horiz', label: 'Exchange'},
 { id: 'builder', icon: 'build', label: 'Packet Builder'},
 { id: 'nodes', icon: 'router', label: 'Nodes'},
 { id: 'pools', icon: 'storage', label: 'Pools'},
 { id: 'scopes', icon: 'settings_ethernet', label: 'Scopes'},
 { id: 'leases', icon: 'receipt_long', label: 'Leases'},
 { id: 'validation', icon: 'gpp_good', label: 'Validation'},
 { id: 'logs', icon: 'terminal', label: 'Logs'},
 ];

 const navigate = useNavigate();
 const [isDocOpen, setIsDocOpen] = useState(false);

 return (
 <aside className="fixed left-0 top-0 h-full flex flex-col p-stack-gap z-40 backdrop-blur-3xl text-primary font-label-mono text-label-mono uppercase tracking-wider docked w-64 rounded-r-lg border-r border-white/10 shadow-md hidden md:flex" style={{ backgroundColor: '#ffffff' }}>
 <div className="pt-20 pb-8 px-4 flex flex-col gap-2">
 <button 
    onClick={() => navigate('/')} 
    className="self-start mb-4 text-gray-400 hover:text-gray-700 flex items-center gap-1 transition-colors"
  >
    <span className="material-symbols-outlined text-[18px]">arrow_back</span>
    Back
  </button>
 <div className="flex items-center gap-3 mb-6">
 <div className="w-12 h-12 rounded-lg bg-surface-container-high border border-white/40 overflow-hidden flex items-center justify-center text-primary shadow-sm">
 <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1"}}>router</span>
 </div>
 <div>
 <div className="font-headline-md text-headline-md text-primary font-bold">DHCP.EMU</div>
 <div className="text-xs text-on-surface-variant normal-case mt-1">Protocol Engine v2.4</div>
 </div>
 </div>
 </div>
 
 <nav className="flex-1 flex flex-col gap-2">
 {tabs.map(tab => (
 <button
 key={tab.id}
 onClick={() => setActiveTab(tab.id)}
 className={`flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all duration-150 ease-in-out hover:translate-x-[2px] active:scale-[0.98] ${
 activeTab === tab.id 
 ? 'bg-[rgba(0,0,0,0.08)] text-[#d95c41] border-l-4 border-l-[#d95c41] font-bold shadow-sm' 
 : 'text-on-surface-variant hover:text-on-surface hover:bg-[rgba(0,0,0,0.06)]'
}`}
 >
 <span className="material-symbols-outlined">{tab.icon}</span> {tab.label}
 </button>
 ))}
 </nav>

 <div className="mt-auto flex flex-col gap-4">
 <button 
 onClick={startExchange}
 disabled={loading || isSuccess}
 className="w-full py-3 px-4 bg-primary text-on-primary rounded-full flex items-center justify-center gap-2 hover:bg-primary-container hover:text-on-primary-container transition-colors shadow-md font-label-mono text-label-mono uppercase font-bold active:scale-95 duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
 >
 {loading ? (
 <span className="w-5 h-5 border-2 border-on-primary border-t-transparent rounded-full animate-spin"></span>
 ) : (
 <span className="material-symbols-outlined text-[20px]">play_arrow</span>
 )}
 {loading ? 'Starting...' : 'Start Exchange'}
 </button>
 <div className="border-t border-white/10 pt-4 flex flex-col gap-2">
 <button 
 onClick={() => setIsDocOpen(true)}
 className="flex items-center gap-3 text-on-surface-variant px-4 py-2 hover:text-on-surface hover:bg-white/10 bg-transparent hover:backdrop-blur-md rounded-full transition-all text-xs text-left w-full"
 >
 <span className="material-symbols-outlined text-[18px]">help_outline</span> Documentation
 </button>
 </div>
 </div>
 <DocumentationPanel isOpen={isDocOpen} onClose={() => setIsDocOpen(false)} />
 </aside>
 );
}
