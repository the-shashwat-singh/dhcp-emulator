import { useState, useEffect, useRef } from 'react';
import { useToast } from '../context/ToastContext';

export interface DhcpEvent {
  event: string;
  current_state?: string;
  client_ip?: string;
  meta?: any;
  timestamp?: number;
  packet?: any;
}

export function useWebSocket(url: string) {
  const { addToast } = useToast();
  const [events, setEvents] = useState<DhcpEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const [globalState, setGlobalState] = useState({ state: 'IDLE', client_ip: '0.0.0.0', meta: {} });
  const ws = useRef<WebSocket | null>(null);
  const disconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const connect = () => {
      if (ws.current?.readyState === WebSocket.OPEN || ws.current?.readyState === WebSocket.CONNECTING) {
        return;
      }
      ws.current = new WebSocket(url);
      
      ws.current.onopen = () => {
        if (disconnectTimer.current) clearTimeout(disconnectTimer.current);
        setConnected(true);
      };

      ws.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.event === "RESET") {
          setEvents([]);
          setGlobalState({ state: 'IDLE', client_ip: '0.0.0.0', meta: {} });
        } else {
          setEvents((prev) => [...prev, data]);
          if (data.current_state) {
            setGlobalState(prev => ({
              state: data.current_state || prev.state,
              client_ip: data.client_ip || prev.client_ip,
              meta: data.meta || prev.meta
            }));
          }
        }
      };

      ws.current.onclose = () => {
        disconnectTimer.current = setTimeout(() => {
          setConnected(false);
          addToast({ message: 'Backend Disconnected. Reconnecting...', type: 'error', duration: 8000 });
        }, 2000);
        setTimeout(connect, 3000);
      };
    };

    connect();

    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [url]);

  return { events, connected, globalState, setEvents };
}
