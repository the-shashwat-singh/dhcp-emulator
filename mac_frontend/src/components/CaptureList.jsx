import React, { useState, useEffect} from 'react';
import { Download, Play, FileTerminal, Square} from 'lucide-react';

export default function CaptureList() {
 const [captures, setCaptures] = useState([]);
 const [isCapturing, setIsCapturing] = useState(false);
 const [loading, setLoading] = useState(false);

 const fetchCaptures = async () => {
 try {
 const res = await fetch('http://localhost:8000/api/captures');
 const data = await res.json();
 setCaptures(data);
} catch (e) {
 console.error(e);
}
};

 useEffect(() => {
 fetchCaptures();
}, [isCapturing]);

 const toggleCapture = async () => {
 setLoading(true);
 try {
 if (isCapturing) {
 await fetch('http://localhost:8000/api/capture/stop', { method: 'POST'});
 setIsCapturing(false);
} else {
 await fetch('http://localhost:8000/api/capture/start', { method: 'POST'});
 setIsCapturing(true);
}
} catch (e) {
 console.error(e);
}
 setLoading(false);
};

 return (
 <div className="flex flex-col gap-4">
 <div className="flex justify-between items-center bg-black border border-gray-800 p-4 rounded-lg">
 <div className="text-sm text-secondary">
 {isCapturing ? (
 <span className="flex items-center gap-2 text-active">
 <span className="animate-pulse w-2 h-2 rounded-full bg-active"></span>
 Capture running on vm-server (enp0s1)...
 </span>
 ) : "No active capture running."}
 </div>
 <button 
 onClick={toggleCapture}
 disabled={loading}
 className={`flex items-center gap-2 px-4 py-1.5 text-xs font-semibold rounded transition-colors border ${
 isCapturing 
 ? 'bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30' 
 : 'bg-gray-800 text-white border-gray-700 hover:bg-gray-700'
}`}
 >
 {isCapturing ? <Square className="w-3 h-3" /> : <Play className="w-3 h-3" />}
 {isCapturing ? "Stop Capture" : "Start Capture"}
 </button>
 </div>

 <div className="bg-black border border-gray-800 rounded-lg overflow-hidden">
 <table className="w-full text-sm text-left">
 <thead className="bg-gray-900/50 text-secondary text-xs uppercase">
 <tr>
 <th className="px-4 py-3 font-medium">Filename</th>
 <th className="px-4 py-3 font-medium text-center">Packets</th>
 <th className="px-4 py-3 font-medium text-right">Actions</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-800/50">
 {captures.length === 0 ? (
 <tr>
 <td colSpan="3" className="px-4 py-6 text-center text-gray-500 text-xs">
 No captures available.
 </td>
 </tr>
 ) : captures.map((cap, i) => (
 <tr key={i} className="hover:bg-gray-800/20 transition-colors">
 <td className="px-4 py-3 flex items-center gap-2 text-gray-300">
 <FileTerminal className="w-4 h-4 text-gray-500" />
 {cap.filename}
 </td>
 <td className="px-4 py-3 text-center text-gray-400 font-mono text-xs bg-gray-900/30">
 {cap.packets}
 </td>
 <td className="px-4 py-3 flex justify-end gap-2">
 <a 
 href={`http://localhost:8000/api/captures/download?filename=${cap.filename}`} 
 download
 className="p-1.5 hover:bg-gray-800 rounded text-gray-400 hover:text-white transition-colors" 
 title="Download PCAP"
 >
 <Download className="w-4 h-4" />
 </a>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </div>
 );
}
