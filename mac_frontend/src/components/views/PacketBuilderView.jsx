import React, { useState } from 'react';
import { useToast } from '../../context/ToastContext';

const PRESETS = {
  discover: {
    label: 'Normal DISCOVER',
    spec: { message_type: 'DISCOVER', client_mac: '82:f5:87:05:94:e9', xid: '0x4a2dea6d', requested_ip: '', server_id: '', ciaddr: '0.0.0.0', flags: 'broadcast', hostname: 'dhcp-client', lease_time: '', param_req_list: [1, 3, 6, 15, 28, 51, 54, 58, 59] }
  },
  decline: {
    label: 'DECLINE after OFFER',
    spec: { message_type: 'DECLINE', client_mac: '82:f5:87:05:94:e9', xid: '0x4a2dea6d', requested_ip: '192.168.128.100', server_id: '192.168.128.10', ciaddr: '0.0.0.0', flags: 'unicast', hostname: 'dhcp-client', lease_time: '', param_req_list: [] }
  },
  release: {
    label: 'Release Current Lease',
    spec: { message_type: 'RELEASE', client_mac: '82:f5:87:05:94:e9', xid: '0x4a2dea6d', requested_ip: '', server_id: '192.168.128.10', ciaddr: '192.168.128.100', flags: 'unicast', hostname: '', lease_time: '', param_req_list: [] }
  },
  inform: {
    label: 'INFORM (no DORA)',
    spec: { message_type: 'INFORM', client_mac: '82:f5:87:05:94:e9', xid: '0x4a2dea6d', requested_ip: '', server_id: '', ciaddr: '192.168.128.100', flags: 'unicast', hostname: 'dhcp-client', lease_time: '', param_req_list: [1, 3, 6] }
  }
};

const OPTIONS_LIST = [1, 3, 6, 12, 15, 28, 51, 53, 54, 58, 59, 61, 82];

export default function PacketBuilderView({ setActiveTab }) {
  const [activePreset, setActivePreset] = useState('discover');
  const [spec, setSpec] = useState(PRESETS.discover.spec);
  const { addToast } = useToast();

  const handlePreset = (key) => {
    setActivePreset(key);
    setSpec(PRESETS[key].spec);
  };

  const updateSpec = (field, value) => {
    setSpec(prev => ({ ...prev, [field]: value }));
    setActivePreset(null);
  };

  const generateRandomXid = () => {
    const xid = '0x' + Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, '0');
    updateSpec('xid', xid);
  };

  const generateRandomMac = () => {
    const mac = Array.from({length: 6}, (_, i) => {
      const b = Math.floor(Math.random() * 256);
      return i === 0 ? ((b & 0xFE) | 0x02).toString(16).padStart(2, '0') : b.toString(16).padStart(2, '0');
    }).join(':');
    updateSpec('client_mac', mac);
  };

  const toggleOption = (opt) => {
    setSpec(prev => {
      const prl = prev.param_req_list.includes(opt) 
        ? prev.param_req_list.filter(o => o !== opt)
        : [...prev.param_req_list, opt].sort((a,b)=>a-b);
      return { ...prev, param_req_list: prl };
    });
    setActivePreset(null);
  };

  const handleInject = async (silently) => {
    try {
      await fetch('http://localhost:8000/api/inject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(spec)
      });
      addToast({ message: 'Packet injected — watching for server response...', type: 'info' });
      if (!silently) {
        setActiveTab('exchange');
      }
    } catch (e) {
      addToast({ message: 'Failed to inject packet', type: 'error' });
    }
  };

  const buildScapyCode = () => {
    const mac = spec.client_mac || "00:00:00:00:00:00";
    const dstIp = spec.flags === 'broadcast' ? "255.255.255.255" : (spec.server_id || "255.255.255.255");
    const dport = spec.ciaddr !== "0.0.0.0" && spec.flags === 'unicast' ? 67 : 67; 
    
    let options = `[("message-type", "${spec.message_type}")`;
    if (spec.requested_ip) options += `, ("requested_addr", "${spec.requested_ip}")`;
    if (spec.server_id) options += `, ("server_id", "${spec.server_id}")`;
    if (spec.hostname) options += `, ("hostname", "${spec.hostname}")`;
    if (spec.lease_time) options += `, ("lease_time", ${spec.lease_time})`;
    if (spec.param_req_list.length > 0) options += `, ("param_req_list", [${spec.param_req_list.join(',')}])`;
    options += `, "end"]`;

    return `from scapy.all import *
pkt = (
  Ether(src="${mac}", dst="ff:ff:ff:ff:ff:ff") /
  IP(src="${spec.ciaddr}", dst="${dstIp}") /
  UDP(sport=68, dport=${dport}) /
  BOOTP(op=1, chaddr=bytes.fromhex("${mac.replace(/:/g, '')}".padEnd(32, '0')), xid=${spec.xid}, ciaddr="${spec.ciaddr}", flags=${spec.flags === 'broadcast' ? '0x8000' : '0x0000'}) /
  DHCP(options=${options})
)
sendp(pkt, iface="enp0s1", verbose=True)`;
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-4">
      {/* LEFT COLUMN - FORM */}
      <div className="w-full lg:w-1/2 flex flex-col gap-6">
        <div className="glass-panel rounded-2xl p-6 border border-gray-100 shadow-sm bg-white/50 backdrop-blur-md">
          <h2 className="font-headline-md font-bold text-gray-900 mb-4">PRESET SCENARIOS</h2>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(PRESETS).map(([key, preset]) => (
              <button
                key={key}
                onClick={() => handlePreset(key)}
                className={`py-2 px-3 text-sm font-semibold rounded-lg border transition-all ${
                  activePreset === key 
                    ? 'bg-primary text-on-primary border-primary shadow-md' 
                    : 'bg-white text-gray-700 border-gray-200 hover:border-primary/50'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-6 border border-gray-100 shadow-sm bg-white/50 backdrop-blur-md flex flex-col gap-5">
          <h2 className="font-headline-md font-bold text-gray-900">PACKET FIELDS</h2>
          
          <div className="flex flex-col gap-1">
            <label className="text-sm font-bold text-gray-700">MESSAGE TYPE</label>
            <select 
              className="p-2 rounded-md border border-gray-200 bg-white"
              value={spec.message_type}
              onChange={e => updateSpec('message_type', e.target.value)}
            >
              <option value="DISCOVER"><span data-tooltip="DISCOVER">DISCOVER</span></option>
              <option value="OFFER"><span data-tooltip="OFFER">OFFER</span></option>
              <option value="REQUEST"><span data-tooltip="REQUEST">REQUEST</span></option>
              <option value="ACK"><span data-tooltip="ACK">ACK</span></option>
              <option value="NAK">NAK</option>
              <option value="RELEASE"><span data-tooltip="RELEASE">RELEASE</span></option>
              <option value="DECLINE">DECLINE</option>
              <option value="INFORM">INFORM</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-bold text-gray-700 flex justify-between items-center">
              CLIENT MAC
              <div className="flex gap-3">
                <button onClick={generateRandomMac} className="text-primary text-xs font-bold hover:underline">🎲 RANDOM MAC</button>
                <button onClick={() => updateSpec('client_mac', '82:f5:87:05:94:e9')} className="text-primary text-xs font-bold hover:underline">USE REAL MAC</button>
              </div>
            </label>
            <input 
              type="text" 
              className="p-2 rounded-md border border-gray-200 bg-white font-mono text-sm"
              value={spec.client_mac}
              onChange={e => updateSpec('client_mac', e.target.value)}
            />
            <span className="text-xs text-gray-500">Hardware address of the client interface (<span data-tooltip="chaddr">chaddr</span> field)</span>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-bold text-gray-700 flex justify-between">
              <span data-tooltip="xid">XID</span>
              <button onClick={generateRandomXid} className="text-primary text-xs font-bold hover:underline">🎲 RANDOM</button>
            </label>
            <input 
              type="text" 
              className="p-2 rounded-md border border-gray-200 bg-white font-mono text-sm"
              value={spec.xid}
              onChange={e => updateSpec('xid', e.target.value)}
            />
            <span className="text-xs text-gray-500">Transaction ID — must match across all 4 <span data-tooltip="DORA">DORA</span> packets</span>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-bold text-gray-700">REQUESTED IP</label>
            <input 
              type="text" 
              className="p-2 rounded-md border border-gray-200 bg-white font-mono text-sm"
              value={spec.requested_ip}
              onChange={e => updateSpec('requested_ip', e.target.value)}
              placeholder="e.g. 192.168.128.100"
            />
            <span className="text-xs text-gray-500">Option 50 — IP the client wants to keep</span>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-bold text-gray-700 flex justify-between">
              SERVER ID
              <button onClick={() => updateSpec('server_id', '192.168.128.10')} className="text-primary text-xs font-bold hover:underline">USE SERVER IP</button>
            </label>
            <input 
              type="text" 
              className="p-2 rounded-md border border-gray-200 bg-white font-mono text-sm"
              value={spec.server_id}
              onChange={e => updateSpec('server_id', e.target.value)}
              placeholder="e.g. 192.168.128.10"
            />
            <span className="text-xs text-gray-500">Option 54 — tells other servers which one was chosen</span>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-bold text-gray-700"><span data-tooltip="ciaddr">CIADDR</span></label>
            <input 
              type="text" 
              className="p-2 rounded-md border border-gray-200 bg-white font-mono text-sm"
              value={spec.ciaddr}
              onChange={e => updateSpec('ciaddr', e.target.value)}
            />
            <span className="text-xs text-gray-500">Client IP — only non-zero if client already has a lease (INFORM/<span data-tooltip="RELEASE">RELEASE</span>)</span>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-bold text-gray-700"><span data-tooltip="flags">FLAGS</span></label>
            <select 
              className="p-2 rounded-md border border-gray-200 bg-white"
              value={spec.flags}
              onChange={e => updateSpec('flags', e.target.value)}
            >
              <option value="broadcast"><span data-tooltip="broadcast">Broadcast</span></option>
              <option value="unicast">Unicast</option>
            </select>
            <span className="text-xs text-gray-500">0x8000 = <span data-tooltip="REQUEST">request</span> <span data-tooltip="broadcast">broadcast</span> reply, 0x0000 = unicast</span>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-bold text-gray-700">HOSTNAME</label>
            <input 
              type="text" 
              className="p-2 rounded-md border border-gray-200 bg-white font-mono text-sm"
              value={spec.hostname}
              onChange={e => updateSpec('hostname', e.target.value)}
            />
            <span className="text-xs text-gray-500">Option 12 — client hostname sent to server</span>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-bold text-gray-700">LEASE TIME <span data-tooltip="REQUEST">REQUEST</span></label>
            <input 
              type="number" 
              className="p-2 rounded-md border border-gray-200 bg-white font-mono text-sm"
              value={spec.lease_time}
              onChange={e => updateSpec('lease_time', e.target.value)}
              placeholder="e.g. 3600"
            />
            <span className="text-xs text-gray-500">Option 51 — client can <span data-tooltip="REQUEST">request</span> a specific lease duration (seconds)</span>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-bold text-gray-700">PARAM REQ LIST</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {OPTIONS_LIST.map(opt => (
                <button
                  key={opt}
                  onClick={() => toggleOption(opt)}
                  className={`px-2 py-1 rounded text-xs font-mono border transition-colors ${
                    spec.param_req_list.includes(opt) ? 'bg-primary text-white border-primary' : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
                  }`}
                >
                  Opt {opt}
                </button>
              ))}
            </div>
            <span className="text-xs text-gray-500 mt-1">Options the client wants the server to return</span>
          </div>

        </div>
      </div>

      {/* RIGHT COLUMN - PREVIEW */}
      <div className="w-full lg:w-1/2 flex flex-col gap-6 sticky top-24 self-start">
        <div className="glass-panel rounded-2xl p-6 border border-gray-100 shadow-sm bg-white/50 backdrop-blur-md">
          <h2 className="font-headline-md font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined">visibility</span> Live Preview
          </h2>
          
          <div className="bg-white/80 backdrop-blur-md rounded-xl overflow-hidden shadow-sm flex flex-col" style={{ border: '1px solid rgba(242, 166, 90, 0.3)' }}>
            <div className="px-4 py-3 border-b border-gray-100/50 flex justify-between items-center bg-white/50">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-gray-400 text-[18px]">dynamic_form</span>
                <span className="font-semibold text-gray-700 text-sm">Draft Packet</span>
              </div>
              <div className="flex gap-2 items-center">
                <span className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full text-[10px] font-bold">~319 bytes</span>
                <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold border ${
                  spec.message_type === 'DISCOVER' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                  spec.message_type === 'OFFER' ? 'bg-purple-100 text-purple-700 border-purple-200' :
                  spec.message_type === 'REQUEST' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                  spec.message_type === 'ACK' ? 'bg-green-100 text-green-700 border-green-200' :
                  'bg-gray-100 text-gray-700 border-gray-200'
                }`}>
                  {spec.message_type}
                </span>
              </div>
            </div>
            
            <div className="p-4 flex flex-col gap-3 text-sm">
              <div className="flex items-start gap-3">
                <div className="w-16 shrink-0 text-[11px] font-bold text-gray-400 uppercase mt-0.5">Ethernet</div>
                <div className="flex gap-4 font-mono text-gray-800 text-[13px]">
                  <span><span className="text-gray-400 text-[11px] mr-1">src</span>{spec.client_mac}</span>
                  <span><span className="text-gray-400 text-[11px] mr-1">dst</span>ff:ff:ff:ff:ff:ff</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-16 shrink-0 text-[11px] font-bold text-gray-400 uppercase mt-0.5">IP</div>
                <div className="flex gap-4 font-mono text-gray-800 text-[13px]">
                  <span><span className="text-gray-400 text-[11px] mr-1">src</span>{spec.ciaddr}</span>
                  <span><span className="text-gray-400 text-[11px] mr-1">dst</span>255.255.255.255</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-16 shrink-0 text-[11px] font-bold text-gray-400 uppercase mt-0.5">UDP</div>
                <div className="flex gap-4 font-mono text-gray-800 text-[13px]">
                  <span><span className="text-gray-400 text-[11px] mr-1">sport</span>68</span>
                  <span><span className="text-gray-400 text-[11px] mr-1">dport</span>67</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-16 shrink-0 text-[11px] font-bold text-gray-400 uppercase mt-0.5"><span data-tooltip="BOOTP">BOOTP</span></div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-gray-800 text-[13px]">
                  <span><span className="text-gray-400 text-[11px] mr-1">op</span>1</span>
                  <span><span className="text-gray-400 text-[11px] mr-1"><span data-tooltip="xid">xid</span></span>{spec.xid}</span>
                  <span><span className="text-gray-400 text-[11px] mr-1"><span data-tooltip="flags">flags</span></span>{spec.flags === 'broadcast' ? '0x8000' : '0x0000'}</span>
                  <span><span className="text-gray-400 text-[11px] mr-1"><span data-tooltip="ciaddr">ciaddr</span></span>{spec.ciaddr}</span>
                  <span><span className="text-gray-400 text-[11px] mr-1"><span data-tooltip="chaddr">chaddr</span></span>{spec.client_mac}</span>
                </div>
              </div>

              <div className="flex items-start gap-3 mt-2 pt-3 border-t border-gray-100/50">
                <div className="w-16 shrink-0 text-[11px] font-bold text-gray-400 uppercase mt-0.5">Options</div>
                <div className="flex flex-col gap-1 font-mono text-gray-800 text-[13px]">
                  <div className="flex"><span className="w-8 text-gray-400">53:</span><span>message-type = {spec.message_type}</span></div>
                  {spec.requested_ip && <div className="flex"><span className="w-8 text-gray-400">50:</span><span>requested_ip = {spec.requested_ip}</span></div>}
                  {spec.server_id && <div className="flex"><span className="w-8 text-gray-400">54:</span><span>server_id = {spec.server_id}</span></div>}
                  {spec.hostname && <div className="flex"><span className="w-8 text-gray-400">12:</span><span>hostname = {spec.hostname}</span></div>}
                  {spec.lease_time && <div className="flex"><span className="w-8 text-gray-400">51:</span><span>lease_time = {spec.lease_time}</span></div>}
                  {spec.param_req_list.length > 0 && <div className="flex"><span className="w-8 text-gray-400">55:</span><span>param_req_list = [{spec.param_req_list.join(',')}]</span></div>}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-gray-500 uppercase">Scapy Code</span>
              <button 
                onClick={() => navigator.clipboard.writeText(buildScapyCode())}
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[14px]">content_copy</span> Copy
              </button>
            </div>
            <pre className="bg-[#1e1e1e] text-[#d4d4d4] font-mono text-[10px] p-4 rounded-xl overflow-x-auto shadow-inner border border-gray-800">
              {buildScapyCode()}
            </pre>
          </div>
        </div>

        <div className="flex gap-4 mt-2">
          <button 
            onClick={() => handleInject(false)}
            className="flex-1 py-4 bg-primary text-white rounded-xl font-bold font-label-mono uppercase shadow-md hover:bg-primary-container hover:text-on-primary-container hover:shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined">send</span> Inject & Watch
          </button>
          <button 
            onClick={() => handleInject(true)}
            className="flex-1 py-4 bg-white text-gray-700 border border-gray-300 rounded-xl font-bold font-label-mono uppercase shadow-sm hover:bg-gray-50 hover:text-gray-900 transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined">visibility_off</span> Inject Silently
          </button>
        </div>

      </div>
    </div>
  );
}
