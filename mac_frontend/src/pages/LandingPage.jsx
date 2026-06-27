import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import DocumentationPanel from '../components/DocumentationPanel';

export default function LandingPage() {
 const navigate = useNavigate();
 const [isDocOpen, setIsDocOpen] = useState(false);

 useEffect(() => {
 const observer = new IntersectionObserver(
 (entries) => entries.forEach(e => {
 if (e.isIntersecting) e.target.classList.add('active')
}),
 { threshold: 0.15}
 );
 document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
 return () => observer.disconnect();
}, []);

 return (
 <>
 {/* Ambient Lighting Blobs (moved to outermost level) */}
 <div className="fixed inset-0 z-[-1] pointer-events-none overflow-hidden">
 <div className="glow-blob-1" />
 <div className="glow-blob-2" />
 </div>

 <DocumentationPanel isOpen={isDocOpen} onClose={() => setIsDocOpen(false)} />

 <div className="relative antialiased selection:bg-primary-container selection:text-on-primary-container min-h-screen bg-background">
 {/* Global Background Shader */}
 <div className="fixed inset-0 z-[-2] pointer-events-none opacity-20 mix-blend-overlay bg-surface-container-low" />

 {/* TopNavBar */}
 <header className="bg-surface/80 backdrop-blur-xl docked full-width top-0 sticky z-50 border-b border-white/20 shadow-sm transition-all duration-300">
 <div className="flex justify-between items-center w-full px-margin-page max-w-7xl mx-auto h-20">
 <div className="flex items-center gap-4">
 <span className="material-symbols-outlined text-primary text-3xl" style={{ fontVariationSettings: "'FILL' 1"}}>lan</span>
 <span className="text-headline-md font-headline-md font-bold tracking-tight text-on-surface ">DHCP.EMU</span>
 </div>
 <nav className="hidden md:flex gap-8 items-center">
 <a className="text-on-surface hover:text-primary :text-primary-container transition-colors text-label-mono font-label-mono cursor-pointer" href="#features">Features</a>
 <button onClick={() => setIsDocOpen(true)} className="text-on-surface hover:text-primary :text-primary-container transition-colors text-label-mono font-label-mono cursor-pointer">Docs</button>
 </nav>
 <div className="flex items-center gap-4">
 <a href="https://github.com/the-shashwat-singh/dhcp-emulator.git" target="_blank" rel="noreferrer" className="bg-gradient-to-r from-primary to-secondary text-on-primary px-6 py-2.5 rounded-full font-label-mono text-label-mono font-semibold shadow-md hover:shadow-lg hover:scale-95 duration-100 ease-in-out transition-all">
 View on GitHub
 </a>
 </div>
 </div>
 </header>

 <main className="w-full flex flex-col">
 {/* Hero Section */}
 <section className="min-h-[921px] flex flex-col justify-center items-center px-margin-page max-w-7xl mx-auto w-full pt-20 pb-32 relative">
 <div className="text-center max-w-3xl mb-16 reveal">
 <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/50 backdrop-blur-md border border-white/80 mb-6 shadow-sm">
 <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
 <span className="text-label-mono font-label-mono text-primary font-medium tracking-wide uppercase">v2.0 Beta Live</span>
 </div>
 <h1 className="text-display-lg font-display-lg text-on-surface mb-6 leading-tight">
 DHCP Protocol Emulation, <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">Visualized.</span>
 </h1>
 <p className="text-body-lg font-body-lg text-on-surface-variant max-w-2xl mx-auto leading-relaxed">
 A real-time DHCP emulator for engineers and students. Watch live packet exchanges, inspect every byte, and simulate complex network topologies across virtual machines.
 </p>
 <div className="flex items-center justify-center gap-4 mt-10">
 <button onClick={() => navigate('/dashboard')} className="bg-gradient-to-r from-primary to-secondary text-on-primary px-8 py-3.5 rounded-full font-label-mono text-label-mono font-semibold shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
 Get Started
 </button>
 </div>
 </div>

 {/* Hero Visual: macOS style window */}
 <div className="w-full max-w-5xl glass-panel rounded-xl overflow-hidden shadow-2xl reveal relative group">
 <div className="h-10 bg-white/50 border-b border-white/60 flex items-center px-4 gap-2 backdrop-blur-md">
 <div className="w-3 h-3 rounded-full bg-error/80 border border-error" />
 <div className="w-3 h-3 rounded-full bg-yellow-500/80 border border-yellow-600" />
 <div className="w-3 h-3 rounded-full bg-tertiary/80 border border-tertiary" />
 <div className="flex-1 text-center text-label-mono font-label-mono text-on-surface-variant/70 text-xs">DHCP Topology Inspector</div>
 </div>
 <div className="p-12 bg-white/30 backdrop-blur-sm relative h-[400px] flex items-center justify-between">
 <div className="flex flex-col items-center gap-3 z-10">
 <div className="w-20 h-20 bg-white rounded-2xl shadow-lg border border-white flex items-center justify-center relative">
 <span className="material-symbols-outlined text-4xl text-primary">laptop_mac</span>
 <div className="absolute -bottom-2 right-2 w-4 h-4 rounded-full bg-primary border-2 border-white animate-pulse" />
 </div>
 <span className="text-label-mono font-label-mono font-semibold">Client (VM2)</span>
 </div>
 <div className="flex-1 h-0.5 bg-gradient-to-r from-primary/30 to-secondary/30 relative mx-4">
 <motion.div 
 animate={{ x: [0, 50, 100, 0], opacity: [1, 0.8, 0, 0]}}
 transition={{ duration: 2, repeat: Infinity, ease: "linear"}}
 className="absolute top-1/2 -translate-y-1/2 left-0 w-8 h-3 rounded-full bg-primary/80 backdrop-blur-md shadow-[0_0_10px_rgba(217,92,65,0.5)]" 
 />
 </div>
 <div className="flex flex-col items-center gap-3 z-10">
 <div className="w-24 h-24 bg-white rounded-2xl shadow-lg border border-white flex items-center justify-center relative">
 <span className="material-symbols-outlined text-5xl text-secondary">router</span>
 </div>
 <span className="text-label-mono font-label-mono font-semibold">Switch (VM3)</span>
 </div>
 <div className="flex-1 h-0.5 bg-gradient-to-r from-secondary/30 to-tertiary/30 relative mx-4">
 <motion.div 
 animate={{ x: [0, 50, 100, 0], opacity: [1, 0.8, 0, 0]}}
 transition={{ duration: 2, repeat: Infinity, ease: "linear", delay: 1}}
 className="absolute top-1/2 -translate-y-1/2 left-0 w-8 h-3 rounded-full bg-secondary/80 backdrop-blur-md shadow-[0_0_10px_rgba(229,154,84,0.5)]" 
 />
 </div>
 <div className="flex flex-col items-center gap-3 z-10">
 <div className="w-20 h-20 bg-white rounded-2xl shadow-lg border border-white flex items-center justify-center">
 <span className="material-symbols-outlined text-4xl text-tertiary">dns</span>
 </div>
 <span className="text-label-mono font-label-mono font-semibold">DHCP Server (VM1)</span>
 </div>
 </div>
 </div>
 </section>

 {/* DORA Section */}
 <section className="py-24 px-margin-page max-w-7xl mx-auto w-full relative">
 <div className="text-center mb-16 reveal">
 <h2 className="text-headline-lg font-headline-lg text-on-surface mb-4">The <span data-tooltip="DORA">DORA</span> Process, Demystified</h2>
 <p className="text-body-md font-body-md text-on-surface-variant max-w-2xl mx-auto">Watch the four-step DHCP exchange happen in real-time, with every packet decoded into human-readable format.</p>
 </div>
 {/* 4 columns layout fixed */}
 <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
 <div className="glass-card rounded-2xl p-6 flex flex-col reveal" style={{ transitionDelay: '0ms'}}>
 <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-4">
 <span className="material-symbols-outlined text-xl">search</span>
 </div>
 <h3 className="text-headline-md font-headline-md text-on-surface mb-2"><span data-tooltip="DISCOVER">Discover</span></h3>
 <p className="text-body-md font-body-md text-on-surface-variant flex-1">Client broadcasts to locate available DHCP servers on the network segment.</p>
 <div className="mt-4 pt-4 border-t border-white/20 text-label-mono font-label-mono text-xs text-on-surface-variant/80">Opcode: 1 (Boot <span data-tooltip="REQUEST">Request</span>)</div>
 </div>
 <div className="glass-card rounded-2xl p-6 flex flex-col reveal" style={{ transitionDelay: '100ms'}}>
 <div className="w-12 h-12 rounded-full bg-secondary/10 text-secondary flex items-center justify-center mb-4">
 <span className="material-symbols-outlined text-xl">redeem</span>
 </div>
 <h3 className="text-headline-md font-headline-md text-on-surface mb-2"><span data-tooltip="OFFER">Offer</span></h3>
 <p className="text-body-md font-body-md text-on-surface-variant flex-1">Server responds with an available IP address and configuration parameters.</p>
 <div className="mt-4 pt-4 border-t border-white/20 text-label-mono font-label-mono text-xs text-on-surface-variant/80">Opcode: 2 (Boot Reply)</div>
 </div>
 <div className="glass-card rounded-2xl p-6 flex flex-col reveal" style={{ transitionDelay: '200ms'}}>
 <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-4">
 <span className="material-symbols-outlined text-xl">pan_tool_alt</span>
 </div>
 <h3 className="text-headline-md font-headline-md text-on-surface mb-2"><span data-tooltip="REQUEST">Request</span></h3>
 <p className="text-body-md font-body-md text-on-surface-variant flex-1">Client formally requests the offered IP address, confirming acceptance.</p>
 <div className="mt-4 pt-4 border-t border-white/20 text-label-mono font-label-mono text-xs text-on-surface-variant/80">Option 53: DHCP <span data-tooltip="REQUEST">Request</span></div>
 </div>
 <div className="glass-card rounded-2xl p-6 flex flex-col reveal" style={{ transitionDelay: '300ms'}}>
 <div className="w-12 h-12 rounded-full bg-tertiary/10 text-tertiary flex items-center justify-center mb-4">
 <span className="material-symbols-outlined text-xl">check_circle</span>
 </div>
 <h3 className="text-headline-md font-headline-md text-on-surface mb-2">Acknowledge</h3>
 <p className="text-body-md font-body-md text-on-surface-variant flex-1">Server confirms the IP allocation, completing the lease process.</p>
 <div className="mt-4 pt-4 border-t border-white/20 text-label-mono font-label-mono text-xs text-on-surface-variant/80">Option 53: DHCP <span data-tooltip="ACK">ACK</span></div>
 </div>
 </div>
 </section>

 {/* Features Bento Grid */}
 <section id="features" className="py-24 px-margin-page max-w-7xl mx-auto w-full relative">
 <div className="text-center mb-16 reveal">
 <h2 className="text-headline-lg font-headline-lg text-on-surface mb-4">Powerful Emulation Features</h2>
 </div>
 <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[250px]">
 <div className="md:col-span-2 glass-card rounded-3xl p-8 flex flex-col md:flex-row gap-6 items-center reveal overflow-hidden relative">
 <div className="flex-1 z-10">
 <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-4 border border-primary/20">
 <span className="material-symbols-outlined text-primary">data_object</span>
 </div>
 <h3 className="text-headline-md font-headline-md text-on-surface mb-2">Live Packet Inspector</h3>
 <p className="text-body-md font-body-md text-on-surface-variant">Deep dive into every byte. Decode DHCP options in real-time with our structured JSON viewer directly in the dashboard.</p>
 </div>
 <div className="flex-1 w-full h-full bg-surface-container/50 rounded-xl border border-white/50 p-4 font-label-mono text-xs overflow-hidden relative shadow-inner">
 <pre className="text-on-surface-variant opacity-70">
{`{
 "op": "BOOTREQUEST",
 "htype": "Ethernet",
 "hlen": 6,
 "hops": 0,
 "xid": "0x1a2b3c4d",
 "options": {
 "message_type": "DISCOVER",
 "client_id": "01:aa:bb:cc:dd:ee"
}
}`}
 </pre>
 </div>
 </div>
 
 <div className="glass-card rounded-3xl p-8 flex flex-col justify-center reveal">
 <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center mb-4 border border-secondary/20">
 <span className="material-symbols-outlined text-secondary">alt_route</span>
 </div>
 <h3 className="text-headline-md font-headline-md text-on-surface mb-2">Option 82 Relay</h3>
 <p className="text-body-md font-body-md text-on-surface-variant">Simulate enterprise networks with full <span data-tooltip="relay agent">Relay Agent</span> Information support.</p>
 </div>
 
 <div className="glass-card rounded-3xl p-8 flex flex-col justify-center reveal">
 <div className="w-10 h-10 rounded-full bg-tertiary-container/30 flex items-center justify-center mb-4 border border-tertiary-container/50">
 <span className="material-symbols-outlined text-tertiary">hub</span>
 </div>
 <h3 className="text-headline-md font-headline-md text-on-surface mb-2">Real Exchange</h3>
 <p className="text-body-md font-body-md text-on-surface-variant">Inject actual Layer 2/3 packets onto virtual interfaces using Scapy.</p>
 </div>
 
 <div className="glass-card rounded-3xl p-8 flex flex-col justify-center reveal">
 <div className="w-10 h-10 rounded-full bg-error/10 flex items-center justify-center mb-4 border border-error/20">
 <span className="material-symbols-outlined text-error">bug_report</span>
 </div>
 <h3 className="text-headline-md font-headline-md text-on-surface mb-2">Wireshark Ready</h3>
 <p className="text-body-md font-body-md text-on-surface-variant">PCAP export functionality for external analysis in Wireshark.</p>
 </div>

 <div className="md:col-span-2 glass-card rounded-3xl p-8 flex flex-col justify-center reveal relative overflow-hidden">
 <div className="z-10 relative">
 <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center mb-4 border border-primary/20">
 <span className="material-symbols-outlined text-on-primary-container">build</span>
 </div>
 <h3 className="text-headline-md font-headline-md text-on-surface mb-2">Custom Packet Builder</h3>
 <p className="text-body-md font-body-md text-on-surface-variant w-1/2">Craft malformed packets or test edge cases by constructing custom DHCP payloads through the UI.</p>
 </div>
 </div>

 <div className="glass-card rounded-3xl p-8 flex flex-col justify-center reveal">
 <div className="w-10 h-10 rounded-full bg-secondary-container/30 flex items-center justify-center mb-4 border border-secondary/20">
 <span className="material-symbols-outlined text-secondary">fact_check</span>
 </div>
 <h3 className="text-headline-md font-headline-md text-on-surface mb-2">RFC Compliance Validator</h3>
 <p className="text-body-md font-body-md text-on-surface-variant">Runs 14 automated checks against completed exchanges, verifying compliance with RFC 2131, RFC 2132, and RFC 3046</p>
 </div>

 <div className="glass-card rounded-3xl p-8 flex flex-col justify-center reveal">
 <div className="w-10 h-10 rounded-full bg-primary-container/30 flex items-center justify-center mb-4 border border-primary/20">
 <span className="material-symbols-outlined text-primary">schedule</span>
 </div>
 <h3 className="text-headline-md font-headline-md text-on-surface mb-2">Lease Management</h3>
 <p className="text-body-md font-body-md text-on-surface-variant">Real-time binding table with MAC-to-IP mappings, lease expiry countdowns, renew and release controls</p>
 </div>

 <div className="glass-card rounded-3xl p-8 flex flex-col justify-center reveal">
 <div className="w-10 h-10 rounded-full bg-tertiary-container/30 flex items-center justify-center mb-4 border border-tertiary/20">
 <span className="material-symbols-outlined text-tertiary">dns</span>
 </div>
 <h3 className="text-headline-md font-headline-md text-on-surface mb-2">Multi-Client Pool</h3>
 <p className="text-body-md font-body-md text-on-surface-variant">Assign IPs from a configurable pool to multiple simultaneous clients with persistent lease database</p>
 </div>
 </div>
 </section>

 {/* Tech Stack Grid */}
 <section className="py-24 px-margin-page max-w-7xl mx-auto w-full text-center relative">
 <h2 className="text-headline-lg font-headline-lg text-on-surface mb-10 reveal">Built with Modern Infrastructure</h2>
 <div className="flex flex-wrap justify-center gap-4 reveal">
 {['Python', 'Scapy', 'FastAPI', 'WebSockets', 'React', 'TypeScript', 'Paramiko'].map((tech) => (
 <span key={tech} className="glass-pill px-6 py-3 rounded-full text-label-mono font-label-mono font-semibold text-on-surface-variant hover:-translate-y-1 transition-all">
 {tech}
 </span>
 ))}
 </div>
 </section>
 </main>

 <footer className="bg-surface-container-lowest border-t border-outline-variant/50 full-width py-12 mt-20">
 <div className="flex flex-col md:flex-row justify-between items-center px-margin-page max-w-7xl mx-auto gap-stack-gap">
 <div className="flex items-center gap-2">
 <span className="material-symbols-outlined text-primary">lan</span>
 <span className="text-headline-md font-headline-md font-bold text-on-surface ">DHCP.EMU</span>
 </div>
 <nav className="flex gap-6">
 <a href="https://github.com/the-shashwat-singh/dhcp-emulator.git" target="_blank" rel="noreferrer" className="text-on-surface-variant hover:text-secondary transition-colors text-label-mono font-label-mono">GitHub</a>
 <button onClick={() => setIsDocOpen(true)} className="text-on-surface-variant hover:text-secondary transition-colors text-label-mono font-label-mono cursor-pointer">Documentation</button>
 </nav>
 <div className="text-body-md font-body-md text-on-surface-variant/70">
 © 2026 Shashwat Singh & Yash Sharma
 </div>
 </div>
 </footer>
 </div>
 </>
 );
}
