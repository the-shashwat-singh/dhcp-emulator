import React, { useState, useEffect} from 'react';
import { Hammer, Send, Info, Wand2, Copy, Check} from 'lucide-react';

export default function PacketBuilder({ setActiveTab}) {
 const [formData, setFormData] = useState({
 type: 'DISCOVER',
 mac: '',
 xid: '',
 requested_ip: '',
 server_id: ''
});
 const [loading, setLoading] = useState(false);
 const [copied, setCopied] = useState(false);
 const [autoComplete, setAutoComplete] = useState(false);

 const presets = {
 DISCOVER: { type: 'DISCOVER', mac: '1a:2b:3c:4d:5e:6f', xid: '0x1234abcd', requested_ip: '', server_id: ''},
 DECLINE: { type: 'DECLINE', mac: '1a:2b:3c:4d:5e:6f', xid: '0x1234abcd', requested_ip: '192.168.128.100', server_id: '192.168.128.10'},
 RELEASE: { type: 'RELEASE', mac: '1a:2b:3c:4d:5e:6f', xid: '0x1234abcd', requested_ip: '192.168.128.100', server_id: '192.168.128.10'},
 INFORM: { type: 'INFORM', mac: '1a:2b:3c:4d:5e:6f', xid: '0x1234abcd', requested_ip: '192.168.128.100', server_id: ''}
};

 const handlePreset = (e) => {
 const key = e.target.value;
 if (presets[key]) setFormData(presets[key]);
};

 const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value});

 const autofill = (field) => {
 const randomHex = () => Math.floor(Math.random() * 16777215).toString(16);
 if (field === 'mac') setFormData(f => ({ ...f, mac: '82:f5:87:05:94:e9'})); // specific vm2 mac
 if (field === 'xid') setFormData(f => ({ ...f, xid: '0x' + randomHex() + randomHex()}));
 if (field === 'ip') setFormData(f => ({ ...f, requested_ip: '192.168.128.100'}));
 if (field === 'server') setFormData(f => ({ ...f, server_id: '192.168.128.10'}));
};

 const generateScapyCode = () => {
 let opts = `[('message-type', '${formData.type}')`;
 if (formData.requested_ip) opts += `, ('requested_addr', '${formData.requested_ip}')`;
 if (formData.server_id) opts += `, ('server_id', '${formData.server_id}')`;
 opts += `]`;
 
 return `from scapy.all import Ether, IP, UDP, BOOTP, DHCP

pkt = Ether(src="${formData.mac || '00:00:00:00:00:00'}", dst="ff:ff:ff:ff:ff:ff") / \\
 IP(src="0.0.0.0", dst="255.255.255.255") / \\
 UDP(sport=68, dport=67) / \\
 BOOTP(chaddr="${formData.mac || '00:00:00:00:00:00'}", xid=${formData.xid || '0x00'}) / \\
 DHCP(options=${opts})
 
pkt.show()`;
};

 const handleCopy = () => {
 navigator.clipboard.writeText(generateScapyCode());
 setCopied(true);
 setTimeout(() => setCopied(false), 2000);
};

 const handleInject = async (e) => {
 e.preventDefault();
 setLoading(true);
 try {
 const payload = { ...formData, auto_complete: autoComplete};
 Object.keys(payload).forEach(k => { if (payload[k] === '' || payload[k] === null) delete payload[k];});
 
 const res = await fetch('http://localhost:8000/api/inject', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json'},
 body: JSON.stringify(payload)
});
 if (res.ok && setActiveTab) setActiveTab('log');
} catch (e) {
 console.error(e);
}
 setLoading(false);
};

 return (
 <div className="flex flex-col h-full bg-black/50 p-6 rounded-lg overflow-y-auto">
 <div className="flex items-center gap-3 mb-6 border-b border-gray-800 pb-4">
 <Hammer className="w-6 h-6 text-blue-400" />
 <h3 className="text-lg font-semibold text-white tracking-wide">Packet Builder</h3>
 </div>
 
 <div className="flex gap-6 flex-col lg:flex-row">
 {/* Form Column */}
 <form onSubmit={handleInject} className="flex flex-col gap-5 flex-1 min-w-[300px]">
 
 <div className="flex flex-col gap-1.5">
 <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Preset Scenario</label>
 <select onChange={handlePreset} defaultValue="" className="w-full bg-gray-900 border border-gray-800 rounded-md p-2.5 text-sm text-white focus:border-blue-500 transition-colors outline-none">
 <option value="" disabled>Select a preset...</option>
 <option value="DISCOVER">Normal <span data-tooltip="DISCOVER">DISCOVER</span></option>
 <option value="DECLINE">DECLINE after <span data-tooltip="OFFER">OFFER</span></option>
 <option value="RELEASE"><span data-tooltip="RELEASE">RELEASE</span> current lease</option>
 <option value="INFORM">INFORM (no <span data-tooltip="DORA">DORA</span>)</option>
 </select>
 </div>

 <div className="flex flex-col gap-1.5">
 <label className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wider group relative">
 Message Type
 <Info className="w-3 h-3 text-gray-500 cursor-help" />
 <span className="absolute left-0 bottom-full mb-1 w-48 p-2 bg-gray-800 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-xl border border-gray-700">
 Determines the DHCP message type (Option 53) in the payload.
 </span>
 </label>
 <select name="type" value={formData.type} onChange={handleChange} className="w-full bg-gray-900 border border-gray-800 rounded-md p-2.5 text-sm text-white focus:border-blue-500 transition-colors outline-none">
 <option value="DISCOVER">DHCP <span data-tooltip="DISCOVER">DISCOVER</span></option>
 <option value="OFFER">DHCP <span data-tooltip="OFFER">OFFER</span></option>
 <option value="REQUEST">DHCP <span data-tooltip="REQUEST">REQUEST</span></option>
 <option value="ACK">DHCP <span data-tooltip="ACK">ACK</span></option>
 <option value="DECLINE">DHCP DECLINE</option>
 <option value="RELEASE">DHCP <span data-tooltip="RELEASE">RELEASE</span></option>
 <option value="INFORM">DHCP INFORM</option>
 <option value="NAK">DHCP NAK</option>
 </select>
 </div>

 <div className="flex flex-col gap-1.5">
 <label className="flex items-center justify-between text-xs font-semibold text-gray-400 uppercase tracking-wider group relative">
 <div className="flex items-center gap-1">
 MAC Address
 <Info className="w-3 h-3 text-gray-500 cursor-help" />
 <span className="absolute left-0 bottom-full mb-1 w-48 p-2 bg-gray-800 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-xl border border-gray-700">
 Client Hardware Address (<span data-tooltip="chaddr">chaddr</span>). Essential for the server to identify the client.
 </span>
 </div>
  <div className="flex gap-2">
    <button type="button" onClick={() => autofill('mac')} className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1">USE REAL MAC</button>
    <button type="button" onClick={() => {
      const randomMac = Array.from({length: 6}, (_, i) => {
        const b = Math.floor(Math.random() * 256);
        return i === 0 ? ((b & 0xFE) | 0x02).toString(16).padStart(2, '0') : b.toString(16).padStart(2, '0');
      }).join(':');
      setFormData(f => ({ ...f, mac: randomMac }));
    }} className="text-[10px] text-purple-400 hover:text-purple-300 flex items-center gap-1"><Wand2 className="w-3 h-3"/> RANDOM MAC</button>
  </div>
 </label>
 <input type="text" name="mac" value={formData.mac} onChange={handleChange} placeholder="e.g. 1a:2b:3c:4d:5e:6f" className="w-full bg-gray-900 border border-gray-800 rounded-md p-2.5 text-sm text-white focus:border-blue-500 font-mono outline-none placeholder:text-gray-700" />
 </div>

 <div className="flex flex-col gap-1.5">
 <label className="flex items-center justify-between text-xs font-semibold text-gray-400 uppercase tracking-wider group relative">
 <div className="flex items-center gap-1">
 <span data-tooltip="XID"><span data-tooltip="xid">XID</span> (Hex)</span>
 <Info className="w-3 h-3 text-gray-500 cursor-help" />
 <span className="absolute left-0 bottom-full mb-1 w-48 p-2 bg-gray-800 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-xl border border-gray-700">
 Transaction ID. Used by the client to match incoming server responses to its requests.
 </span>
 </div>
 <button type="button" onClick={() => autofill('xid')} className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1"><Wand2 className="w-3 h-3"/> Generate Random</button>
 </label>
 <input type="text" name="xid" value={formData.xid} onChange={handleChange} placeholder="e.g. 0x1234abcd" className="w-full bg-gray-900 border border-gray-800 rounded-md p-2.5 text-sm text-white focus:border-blue-500 font-mono outline-none placeholder:text-gray-700" />
 </div>

 <div className="flex flex-col gap-1.5">
 <label className="flex items-center gap-1 text-xs font-semibold text-gray-400 uppercase tracking-wider group relative">
 Requested IP
 <Info className="w-3 h-3 text-gray-500 cursor-help" />
 <span className="absolute left-0 bottom-full mb-1 w-48 p-2 bg-gray-800 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-xl border border-gray-700">
 Option 50. Used in <span data-tooltip="REQUEST">REQUEST</span> to ask for a specific IP, or DECLINE/<span data-tooltip="RELEASE">RELEASE</span> to identify the IP.
 </span>
 </label>
 <input type="text" name="requested_ip" value={formData.requested_ip} onChange={handleChange} placeholder="0.0.0.0" className="w-full bg-gray-900 border border-gray-800 rounded-md p-2.5 text-sm text-white focus:border-blue-500 font-mono outline-none placeholder:text-gray-700" />
 </div>

 <div className="flex flex-col gap-1.5">
 <label className="flex items-center gap-1 text-xs font-semibold text-gray-400 uppercase tracking-wider group relative">
 Server ID
 <Info className="w-3 h-3 text-gray-500 cursor-help" />
 <span className="absolute left-0 bottom-full mb-1 w-48 p-2 bg-gray-800 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-xl border border-gray-700">
 Option 54. Crucial in <span data-tooltip="REQUEST">REQUEST</span> and <span data-tooltip="RELEASE">RELEASE</span> to tell a specific DHCP server the message is for them.
 </span>
 </label>
 <input type="text" name="server_id" value={formData.server_id} onChange={handleChange} placeholder="0.0.0.0" className="w-full bg-gray-900 border border-gray-800 rounded-md p-2.5 text-sm text-white focus:border-blue-500 font-mono outline-none placeholder:text-gray-700" />
 </div>

 {formData.type === 'DISCOVER' && (
 <div className="flex items-center gap-2 mt-2 bg-gray-900/50 p-3 rounded-lg border border-gray-800">
 <input 
 type="checkbox" 
 id="autoComplete" 
 checked={autoComplete} 
 onChange={(e) => setAutoComplete(e.target.checked)}
 className="accent-blue-500 w-4 h-4"
 />
 <label htmlFor="autoComplete" className="text-sm text-white cursor-pointer select-none">
 Auto-complete handshake
 </label>
 </div>
 )}

 <div className="mt-2">
 <button type="submit" disabled={loading} className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50">
 {loading ? <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" /> : <Send className="w-5 h-5" />}
 Inject & Watch
 </button>
 </div>
 </form>

 {/* Code Preview Column */}
 <div className="flex-1 flex flex-col">
 <div className="flex items-center justify-between mb-2">
 <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Scapy Code Equivalent</h4>
 <button onClick={handleCopy} className="text-xs flex items-center gap-1 text-gray-400 hover:text-white transition-colors">
 {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
 {copied ? 'Copied!' : 'Copy Code'}
 </button>
 </div>
 <div className="bg-[#0d1117] border border-gray-800 rounded-lg p-4 font-mono text-[11px] leading-relaxed overflow-x-auto flex-1">
 <pre>
 <span className="text-purple-400">from</span> scapy.all <span className="text-purple-400">import</span> Ether, IP, UDP, <span data-tooltip="BOOTP">BOOTP</span>, DHCP
 <br/><br/>
 <span className="text-blue-400">pkt</span> = Ether(src=<span className="text-green-400">"{formData.mac || '00:00:00:00:00:00'}"</span>, dst=<span className="text-green-400">"ff:ff:ff:ff:ff:ff"</span>) / \
 <br/> IP(src=<span className="text-green-400">"0.0.0.0"</span>, dst=<span className="text-green-400">"255.255.255.255"</span>) / \
 <br/> UDP(sport=<span className="text-orange-400">68</span>, dport=<span className="text-orange-400">67</span>) / \
 <br/> <span data-tooltip="BOOTP">BOOTP</span>(<span data-tooltip="chaddr">chaddr</span>=<span className="text-green-400">"{formData.mac || '00:00:00:00:00:00'}"</span>, <span data-tooltip="xid">xid</span>=<span className="text-orange-400">{formData.xid || '0x00'}</span>) / \
 <br/> DHCP(options=[
 <br/> (<span className="text-green-400">'message-type'</span>, <span className="text-green-400">'{formData.type}'</span>){formData.requested_ip && <span>,<br/> (<span className="text-green-400">'requested_addr'</span>, <span className="text-green-400">'{formData.requested_ip}'</span>)</span>}{formData.server_id && <span>,<br/> (<span className="text-green-400">'server_id'</span>, <span className="text-green-400">'{formData.server_id}'</span>)</span>}
 <br/> ])
 <br/><br/>
 <span className="text-blue-400">pkt</span>.show()
 </pre>
 </div>
 </div>
 </div>
 </div>
 );
}
