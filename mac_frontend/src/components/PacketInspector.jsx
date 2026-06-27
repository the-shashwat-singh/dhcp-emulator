import React, { useState} from 'react';
import LiveLog from './LiveLog';
import PacketDetail from './PacketDetail';
import PacketBuilder from './PacketBuilder';
import CaptureList from './CaptureList';
import LeaseManagement from './LeaseManagement';

export default function PacketInspector({ events, isHexDump}) {
 const [activeTab, setActiveTab] = useState('log');

 const tabs = [
 { id: 'log', label: 'Live Log'},
 { id: 'builder', label: 'Packet Builder'},
 { id: 'leases', label: 'Leases'},
 { id: 'captures', label: 'Captures'}
 ];

 return (
 <div className="flex flex-col h-full bg-panel border border-gray-800/50 rounded-xl overflow-hidden">
 
 {/* Tabs Header */}
 <div className="flex border-b border-gray-800 bg-black/50">
 {tabs.map(tab => (
 <button
 key={tab.id}
 onClick={() => setActiveTab(tab.id)}
 className={`flex-1 py-3 text-sm font-medium transition-colors border-b-2 ${
 activeTab === tab.id 
 ? 'border-active text-white bg-gray-900/50' 
 : 'border-transparent text-secondary hover:text-white hover:bg-gray-800/30'
}`}
 >
 {tab.label}
 </button>
 ))}
 </div>

 {/* Tab Content */}
 <div className="flex-1 overflow-y-auto p-4 relative">
 {activeTab === 'log' && (
 <LiveLog events={events} isHexDump={isHexDump} />
 )}
 {activeTab === 'builder' && (
 <PacketBuilder setActiveTab={setActiveTab} />
 )}
 {activeTab === 'leases' && (
 <LeaseManagement />
 )}
 {activeTab === 'captures' && (
 <CaptureList />
 )}
 </div>
 </div>
 );
}
