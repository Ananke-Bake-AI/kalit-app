// Hook WebSocket vers /api/flow/user-ws (contrat §2). Un socket multiplexé par
// utilisateur. Reconnexion backoff + jitter, heartbeat ping @20s + watchdog 30s,
// re-subscribe avec curseur eventId au retour. Réutilisable indépendamment du shell.

import { useEffect, useRef, useState } from 'react';

export type SocketStatus = 'connecting' | 'open' | 'closed';
export interface Frame { type: string; sessionId?: string; eventId?: number; lastEventId?: number; data?: unknown; [k: string]: unknown; }

export interface SocketApi {
  status: SocketStatus;
  subscribe: (sessionId: string) => void;
  unsubscribe: (sessionId: string) => void;
  onFrame: (fn: (f: Frame) => void) => () => void;
}

/** @param connect ouvre un WebSocket authentifié (broker-client.connectWebSocket) */
export function useBrokerSocket(connect: () => Promise<WebSocket>): SocketApi {
  const [status, setStatus] = useState<SocketStatus>('connecting');
  const wsRef = useRef<WebSocket | null>(null);
  const subs = useRef<Map<string, number>>(new Map());   // sessionId -> lastEventId (curseur)
  const queue = useRef<string[]>([]);                     // frames à envoyer si déconnecté
  const listeners = useRef<Set<(f: Frame) => void>>(new Set());
  const retry = useRef(0);
  const pingTimer = useRef<number | null>(null);
  const watchdog = useRef<number | null>(null);
  const alive = useRef(true);

  const send = (obj: unknown) => {
    const s = JSON.stringify(obj);
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(s);
    else { queue.current.push(s); if (queue.current.length > 100) queue.current.shift(); }
  };

  useEffect(() => {
    alive.current = true;

    const armWatchdog = () => {
      if (watchdog.current) clearTimeout(watchdog.current);
      watchdog.current = window.setTimeout(() => { try { wsRef.current?.close(4001, 'heartbeat timeout'); } catch { /* */ } }, 30_000);
    };

    const open = async () => {
      if (!alive.current) return;
      setStatus('connecting');
      let ws: WebSocket;
      try { ws = await connect(); } catch { schedule(); return; }
      if (!alive.current) { try { ws.close(); } catch { /* */ } return; }
      wsRef.current = ws;

      ws.onopen = () => {
        retry.current = 0;
        setStatus('open');
        // vider la file + re-subscribe tous les curseurs
        queue.current.forEach((s) => ws.send(s)); queue.current = [];
        subs.current.forEach((cursor, sid) => ws.send(JSON.stringify({ op: 'subscribe', sessionId: sid, lastEventId: cursor })));
        armWatchdog();
        if (pingTimer.current) clearInterval(pingTimer.current);
        pingTimer.current = window.setInterval(() => send({ op: 'ping' }), 20_000);
      };
      ws.onmessage = (m) => {
        armWatchdog();
        let f: Frame; try { f = JSON.parse(m.data); } catch { return; }
        // suivi du curseur de reprise
        if (typeof f.eventId === 'number' && f.sessionId) subs.current.set(f.sessionId, Math.max(subs.current.get(f.sessionId) ?? 0, f.eventId));
        if (typeof f.lastEventId === 'number' && f.sessionId) subs.current.set(f.sessionId, Math.max(subs.current.get(f.sessionId) ?? 0, f.lastEventId));
        listeners.current.forEach((fn) => fn(f));
      };
      ws.onclose = () => { setStatus('closed'); if (pingTimer.current) clearInterval(pingTimer.current); schedule(); };
      ws.onerror = () => { try { ws.close(); } catch { /* */ } };
    };

    const schedule = () => {
      if (!alive.current) return;
      retry.current++;
      const base = Math.min(1000 * 2 ** retry.current, 30_000);
      const delay = base * (0.8 + Math.random() * 0.4); // ±20% jitter
      window.setTimeout(open, delay);
    };

    open();
    return () => {
      alive.current = false;
      if (pingTimer.current) clearInterval(pingTimer.current);
      if (watchdog.current) clearTimeout(watchdog.current);
      try { wsRef.current?.close(); } catch { /* */ }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    status,
    subscribe: (sid) => { if (!subs.current.has(sid)) subs.current.set(sid, 0); send({ op: 'subscribe', sessionId: sid, lastEventId: subs.current.get(sid) ?? 0 }); },
    unsubscribe: (sid) => { subs.current.delete(sid); send({ op: 'unsubscribe', sessionId: sid }); },
    onFrame: (fn) => { listeners.current.add(fn); return () => { listeners.current.delete(fn); }; },
  };
}
