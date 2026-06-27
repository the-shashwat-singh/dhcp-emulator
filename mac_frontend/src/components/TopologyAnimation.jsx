import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const EVENT_TO_ANIMATION = {
  'DISCOVER_SENT':      { pill: 'DISCOVER', color: '#3b82f6' },
  'OPTION82_INSERTED':  { color: '#f59e0b', badge: true },
  'DISCOVER_RECEIVED':  { pill: 'DISCOVER', color: '#3b82f6' },
  'OFFER_SENT':         { pill: 'OFFER',    color: '#a855f7' },
  'OFFER_RECEIVED':     { pill: 'OFFER',    color: '#a855f7' },
  'REQUEST_SENT':       { pill: 'REQUEST',  color: '#eab308' },
  'REQUEST_RECEIVED':   { pill: 'REQUEST',  color: '#eab308' },
  'ACK_SENT':           { pill: 'ACK',      color: '#22c55e' },
  'IP_ASSIGNED':        { burst: true, node: 'client' },
};

function getAnimationPath(evt) {
  const eventName = evt.event;
  const from = (evt.from_node || '').toLowerCase();
  
  if (eventName === 'OPTION82_INSERTED') return null;
  if (eventName === 'DISCOVER_SENT') return ['client', 'relay'];
  if (eventName === 'DISCOVER_RECEIVED') return ['relay', 'server'];
  if (eventName === 'OFFER_SENT') {
    return from === 'server' ? ['server', 'relay'] : ['relay', 'client'];
  }
  if (eventName === 'OFFER_RECEIVED') return ['relay', 'client'];
  if (eventName === 'REQUEST_SENT') return ['client', 'relay'];
  if (eventName === 'REQUEST_RECEIVED') return ['relay', 'server'];
  if (eventName === 'ACK_SENT') {
    return from === 'server' ? ['server', 'relay'] : ['relay', 'client'];
  }
  if (eventName === 'IP_ASSIGNED') return ['relay', 'client']; // Burst handles the actual UI pop, this is just in case
  
  // Fallback
  if (evt.from_node && evt.to_node) {
    const f = evt.from_node.toLowerCase();
    const t = evt.to_node.toLowerCase();
    if (['client', 'relay', 'server'].includes(f) && ['client', 'relay', 'server'].includes(t)) {
       return [f, t];
    }
  }
  return null;
}

const EVENT_PRIORITY = {
  'DISCOVER_SENT': 1,
  'DISCOVER_RECEIVED': 2,
  'OFFER_SENT_SERVER': 3,
  'OFFER_SENT_RELAY': 4,
  'OFFER_RECEIVED': 4,
  'REQUEST_SENT': 5,
  'REQUEST_RECEIVED': 6,
  'ACK_SENT_SERVER': 7,
  'ACK_SENT_RELAY': 8,
  'IP_ASSIGNED': 9,
};

const RELAY_IP = '192.168.128.20';

function getEventPriorityKey(evt) {
  if (evt.event === 'OFFER_SENT' || evt.event === 'ACK_SENT') {
    const dst = evt.packet?.dst_ip || evt.packet?.dst || 
                evt.packet?.ip_dst || '';
    
    // Server sends to relay IP = server→relay hop (comes first)
    // Relay sends to client IP = relay→client hop (comes second)
    const isServerToRelay = dst === RELAY_IP;
    
    let key;
    if (evt.event === 'OFFER_SENT') {
      key = isServerToRelay ? 'OFFER_SENT_SERVER' : 'OFFER_SENT_RELAY';
    } else {
      key = isServerToRelay ? 'ACK_SENT_SERVER' : 'ACK_SENT_RELAY';
    }
    
    console.log('SORTING:', evt.event, 'dst:', evt.packet?.dst_ip, evt.packet?.dst, evt.packet?.ip_dst, 'key:', key);
    return key;
  }
  return evt.event;
}

export default function TopologyAnimation({ events, isHexDump }) {
  const containerRef = useRef(null);
  const clientRef = useRef(null);
  const relayRef = useRef(null);
  const serverRef = useRef(null);

  const [coords, setCoords] = useState({ client: null, relay: null, server: null });
  const [activeNodes, setActiveNodes] = useState(new Set());
  const [showOpt82Badge, setShowOpt82Badge] = useState(false);
  const [pills, setPills] = useState([]); // We must trigger re-renders to show pills, so we use state, but we can queue them carefully.
  
  const pillQueueRef = useRef([]);
  const processedEvents = useRef(new Set());
  const [burstNode, setBurstNode] = useState(null);

  const [isReplaying, setIsReplaying] = useState(false);
  const [replayPills, setReplayPills] = useState([]);
  const [isLiveActive, setIsLiveActive] = useState(false);
  const activeTimerRef = useRef(null);

  useEffect(() => {
    if (events && events.length > 0) {
      setIsLiveActive(true);
      if (activeTimerRef.current) clearTimeout(activeTimerRef.current);
      activeTimerRef.current = setTimeout(() => {
        setIsLiveActive(false);
      }, 3000);
    }
    return () => {
      if (activeTimerRef.current) clearTimeout(activeTimerRef.current);
    };
  }, [events]);

  const handleSlowReplay = () => {
    if (isReplaying) return;
    setIsReplaying(true);
    setReplayPills([]);
    
    const sequence = events
      .filter(e => e.event && EVENT_TO_ANIMATION[e.event] && EVENT_TO_ANIMATION[e.event].pill)
      .map(e => {
        const animSpec = EVENT_TO_ANIMATION[e.event];
        const pathArr = getAnimationPath(e);
        if (!pathArr) return null;
        return {
          text: animSpec.pill,
          color: animSpec.color,
          path: pathArr,
          duration: 2500
        };
      })
      .filter(Boolean);

    sequence.forEach((item, idx) => {
      setTimeout(() => {
        const newPill = { ...item, id: `replay_${idx}_${Date.now()}` };
        setReplayPills(prev => [...prev, newPill]);
        
        setTimeout(() => {
          setReplayPills(prev => prev.filter(p => p.id !== newPill.id));
        }, 2500);

        if (idx === sequence.length - 1) {
          setTimeout(() => setIsReplaying(false), 3000);
        }
      }, idx * 1500);
    });
  };

  useEffect(() => {
    const updateCoords = () => {
      if (!containerRef.current || !clientRef.current || !relayRef.current || !serverRef.current) return;
      const cRect = containerRef.current.getBoundingClientRect();
      
      const getCenter = (el) => {
        const rect = el.getBoundingClientRect();
        return { x: rect.left - cRect.left + rect.width / 2, y: rect.top - cRect.top + rect.height / 2 };
      };

      setCoords({
        client: getCenter(clientRef.current),
        relay: getCenter(relayRef.current),
        server: getCenter(serverRef.current),
      });
    };

    updateCoords();
    window.addEventListener('resize', updateCoords);
    // Slight delay to handle fonts loading or layout shifts
    setTimeout(updateCoords, 100);
    setTimeout(updateCoords, 500);
    return () => window.removeEventListener('resize', updateCoords);
  }, []);

  useEffect(() => {
    if (!events || events.length === 0) return;
    
    const timer = setTimeout(() => {
      // Process only new events
      const newEvents = events
        .map((evt, originalIdx) => ({ evt, eventId: `${evt.event}-${originalIdx}` }))
        .filter(({ eventId }) => !processedEvents.current.has(eventId));

      newEvents.forEach(({ evt, eventId }) => {
        processedEvents.current.add(eventId);

      const animSpec = EVENT_TO_ANIMATION[evt.event];
      if (!animSpec) return;

      if (animSpec.burst) {
        setBurstNode(animSpec.node);
        setTimeout(() => setBurstNode(null), 1000);
        return;
      }

      if (animSpec.badge) {
        setShowOpt82Badge(true);
        setTimeout(() => setShowOpt82Badge(false), 2000);
      }

      if (animSpec.pill) {
        const pathArr = getAnimationPath(evt);
        if (!pathArr) return;

        const id = Date.now() + Math.random();
        const duration = (pathArr.length - 1) * 600;
        
        const newPill = { id, text: animSpec.pill, color: animSpec.color, path: pathArr, duration };
        pillQueueRef.current.push(newPill);
        setPills([...pillQueueRef.current]);

        // Highlight nodes
        setActiveNodes(prev => new Set(prev).add(pathArr[0]).add(pathArr[pathArr.length-1]));

        setTimeout(() => {
          pillQueueRef.current = pillQueueRef.current.filter(p => p.id !== id);
          setPills([...pillQueueRef.current]);
          setActiveNodes(prev => {
            const next = new Set(prev);
            next.delete(pathArr[0]);
            next.delete(pathArr[pathArr.length-1]);
            return next;
          });
        }, duration);
      }
    });
    }, 200);
    
    return () => clearTimeout(timer);
  }, [events]);

  const renderNode = (id, icon, label, ipRef, ref) => {
    const isActive = activeNodes.has(id);
    const isBurst = burstNode === id;
    
    return (
      <div className="relative flex flex-col items-center">
        {/* Burst animation */}
        <AnimatePresence>
          {isBurst && (
            <motion.div 
              initial={{ scale: 0.8, opacity: 1, borderWidth: '4px' }}
              animate={{ scale: 2, opacity: 0, borderWidth: '0px' }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="absolute inset-0 rounded-full border-green-500 z-0 pointer-events-none"
              style={{ width: 80, height: 80, top: -10, left: '50%', marginLeft: -40 }}
            />
          )}
        </AnimatePresence>

        <motion.div 
          ref={ref}
          animate={{ scale: isActive ? 1.05 : 1 }}
          className={`w-20 h-20 flex flex-col items-center justify-center backdrop-blur transition-all hover:scale-105 cursor-pointer z-10 relative
            ${id === 'relay' && !isActive 
              ? 'bg-white/30 border border-dashed border-white/80 rounded-xl opacity-50' 
              : 'bg-white/70 border border-white rounded-xl shadow-[inset_0_1px_3px_rgba(255,255,255,1),0_2px_5px_rgba(0,0,0,0.05)]'}
            ${isBurst ? 'border-green-400 bg-green-50' : ''}
          `}
        >
          {id === 'relay' && (
            <AnimatePresence>
              {showOpt82Badge && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: -15 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="absolute -top-6 bg-amber-500 text-white text-[9px] font-bold px-2 py-0.5 rounded shadow-[0_0_10px_rgba(245,158,11,0.6)]"
                >
                  OPT 82
                </motion.div>
              )}
            </AnimatePresence>
          )}

          <div className="w-3 h-3 bg-emerald-400 border-2 border-white rounded-full shadow-[0_0_10px_rgba(52,211,153,0.6)] absolute -top-1 -right-1"></div>
          <span className="material-symbols-outlined text-gray-700 text-3xl mb-1">{icon}</span>
        </motion.div>
        
        <div className="mt-2 flex flex-col items-center">
          <span className="font-semibold text-gray-800 text-sm tracking-wide">{label}</span>
          {isHexDump && <span className="font-mono text-xs text-gray-400">{ipRef}</span>}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col items-center justify-center w-full h-full">
      <div ref={containerRef} className="w-full flex items-center justify-between relative min-h-[160px] overflow-visible">
      
      {/* SVG Connections Layer */}
      {coords.client && coords.server && (
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
          {coords.client && coords.relay && (
            <line x1={coords.client.x} y1={coords.client.y} x2={coords.relay.x} y2={coords.relay.y} stroke="#e5e7eb" strokeWidth="2" strokeDasharray="4 4" />
          )}
          {coords.relay && coords.server && (
            <line x1={coords.relay.x} y1={coords.relay.y} x2={coords.server.x} y2={coords.server.y} stroke="#e5e7eb" strokeWidth="2" strokeDasharray="4 4" />
          )}
        </svg>
      )}

      {/* Nodes */}
      {renderNode('client', 'laptop_mac', 'CLIENT', '.50', clientRef)}
      {renderNode('relay', 'alt_route', 'RELAY', '.20', relayRef)}
      {renderNode('server', 'dns', 'SERVER', '.10', serverRef)}

      {/* Animated Pills */}
      {(isReplaying ? replayPills : pills).map(pill => {
        if (!coords[pill.path[0]]) return null;
        
        // Build keyframes array for x and y
        const xKeyframes = pill.path.map(nodeId => coords[nodeId]?.x || 0);
        const yKeyframes = pill.path.map(nodeId => coords[nodeId]?.y || 0);

        return (
          <motion.div
            key={pill.id}
            initial={{ x: xKeyframes[0], y: yKeyframes[0], opacity: 0, scale: 0.5 }}
            animate={{ 
              x: xKeyframes, 
              y: yKeyframes, 
              opacity: [0, 1, 1, 0],
              scale: [0.5, 1, 1, 0.5] 
            }}
            transition={{ duration: pill.duration / 1000, ease: "linear" }}
            className="absolute top-0 left-0 rounded-full px-2 py-0.5 text-[10px] font-bold font-mono shadow-md text-white z-20 pointer-events-none -ml-6 -mt-3 flex items-center justify-center whitespace-nowrap"
            style={{ backgroundColor: pill.color }}
          >
            {pill.text}
          </motion.div>
        );
      })}
      </div>

      {/* Replay Button */}
      <div className="mt-0 h-8 flex items-center justify-center">
        <button 
          onClick={handleSlowReplay}
          disabled={isLiveActive || isReplaying}
          title={isLiveActive ? "Available after exchange completes" : ""}
          style={{ 
            border: '1px solid #d95c41', 
            color: '#d95c41', 
            background: 'transparent', 
            borderRadius: '999px', 
            padding: '4px 12px', 
            fontSize: '11px', 
            fontWeight: 600, 
            cursor: (isLiveActive || isReplaying) ? 'not-allowed' : 'pointer',
            opacity: (isLiveActive || isReplaying) ? 0.5 : 1
          }}
          className="hover:bg-[rgba(217,92,65,0.08)] transition-colors"
        >
          {isReplaying ? '⟳ Replaying...' : '⟳ Slow Replay'}
        </button>
      </div>
    </div>
  );
}
