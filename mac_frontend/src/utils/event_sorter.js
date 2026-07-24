export const formatTime = (ts) => {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit', 
    second: '2-digit',
    fractionalSecondDigits: 3,
    hour12: false,
    timeZone: 'Asia/Kolkata'
  });
};

export const logicalSort = (events) => {
  const sorted = [...events].sort((a,b) => {
    const tA = (a.display_time || a.timestamp) ? new Date(a.display_time || a.timestamp).getTime() : 0;
    const tB = (b.display_time || b.timestamp) ? new Date(b.display_time || b.timestamp).getTime() : 0;
    
    // Sort strictly by actual timestamp
    if (tA !== tB) return tA - tB;
    
    // Fallback to sequence number if timestamps are perfectly identical
    return (a.seq ?? 999) - (b.seq ?? 999);
  });
  
  const result = [];
  const used = new Set();
  
  for (let i = 0; i < sorted.length; i++) {
    if (used.has(i)) continue;
    const evt = sorted[i];
    
    // For relay→client OFFER/ACK, find the paired 
    // server→relay event and put it first
    if ((evt.event === 'OFFER_SENT' || 
         evt.event === 'ACK_SENT') && 
        evt.from_node === 'relay' && 
        evt.to_node === 'client') {
      // Look ahead for server→relay pair
      const pairIdx = sorted.findIndex((e, j) => 
        j > i && j < i + 3 &&
        e.event === evt.event &&
        e.from_node === 'server' &&
        e.to_node === 'relay'
      );
      if (pairIdx !== -1) {
        const serverEvt = {...sorted[pairIdx]};
        const relayEvt = {...evt};
        
        const baseTime = serverEvt.display_time || serverEvt.timestamp;
        if (baseTime) {
          relayEvt.display_time = new Date(new Date(baseTime).getTime() + 1).toISOString();
        }
        
        result.push(serverEvt);
        result.push(relayEvt);
        used.add(i);
        used.add(pairIdx);
        continue;
      }
    }
    
    if (!used.has(i)) {
      result.push(evt);
      used.add(i);
    }
  }
  return result;
};
