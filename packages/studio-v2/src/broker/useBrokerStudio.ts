// Orchestrateur : branche le shell sur le broker (REST + WS + reducer).
// Respecte les invariants du contrat : le WS est le SEUL writer de l'état live;
// le POST /messages est draîné (backpressure broker) mais n'écrit rien;
// session_stream_closed est autoritaire pour finaliser.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Activity, Message, Segment, Session } from '../lib/types';
import type { BrokerClient } from './client';
import { useBrokerSocket, type Frame } from './socket';
import { StreamReducer, type RawEvent } from './reducer';

interface ChatSessionDTO { id: string; title: string | null; model: string; isProcessing?: boolean; createdAt: number; updatedAt: number; }
interface ChatMessageDTO { id: string; role: string; content?: string; thinking?: string; tools?: Array<{ name: string; input?: unknown; done?: boolean }>; files?: Array<{ name: string; url: string; mimeType?: string }>; createdAt: number; }

function dtoToSession(d: ChatSessionDTO): Session {
  return { id: d.id, title: d.title || 'Sans titre', status: d.isProcessing ? 'running' : 'idle', model: d.model, updatedAt: d.updatedAt || d.createdAt || 0 };
}
function dtoToMessage(d: ChatMessageDTO): Message {
  const segments: Segment[] = [];
  if (d.thinking) segments.push({ kind: 'thinking', content: d.thinking });
  for (const t of d.tools ?? []) segments.push({ kind: 'tool', name: t.name, input: t.input ? JSON.stringify(t.input).slice(0, 200) : undefined, done: t.done ?? true });
  if (d.content) segments.push({ kind: 'text', content: d.content });
  for (const f of d.files ?? []) segments.push({ kind: 'file', name: f.name, url: f.url, mimeType: f.mimeType });
  return { id: d.id, role: d.role === 'user' ? 'user' : 'assistant', segments };
}

// Modèle par défaut : kimi (ollama cloud) — évite le rate-limit Anthropic du
// broker. Taskforce sur openai pour ne pas retomber sur Anthropic côté build.
const DEFAULT_MODEL = 'kimi-k2.5:cloud';
const DEFAULT_TF_PROVIDER = 'openai';

/** Traduit une erreur backend brute en message clair pour l'utilisateur. */
function humanizeError(raw?: string): string {
  const s = raw ?? '';
  if (/429|rate.?limit/i.test(s)) return 'Le service est momentanément saturé (limite de débit). Réessaie dans quelques instants.';
  if (/402|credit/i.test(s)) return 'Crédits insuffisants pour lancer ce projet.';
  if (/timeout|timed out/i.test(s)) return 'Le service met trop de temps à répondre. Réessaie.';
  return 'Une erreur est survenue pendant la génération. Réessaie.';
}

const ACTIVITY: Record<string, string> = { Write: 'écrit un fichier', Edit: 'modifie un fichier', Read: 'lit un fichier', Bash: 'exécute une commande', Task: 'délègue à un sous-agent' };
function activityFor(ev: RawEvent): string {
  if (ev.type === 'thinking') return 'réfléchit';
  if (ev.type === 'text') return 'rédige la réponse';
  if (ev.type === 'tool_use') {
    const n = String(ev.name ?? '');
    if (ACTIVITY[n]) return ACTIVITY[n];
    if (/^mcp__browser/.test(n)) return 'pilote le navigateur';
    if (/find-assets/.test(n)) return 'cherche des assets';
    return `outil ${n}`;
  }
  return 'travaille';
}

export function useBrokerStudio(client: BrokerClient) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [baseMessages, setBaseMessages] = useState<Message[]>([]); // persistés
  const [live, setLive] = useState<{ segments: Segment[]; thinking: string } | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [activity, setActivity] = useState<Activity | null>(null);
  const [liveError, setLiveError] = useState<string | null>(null); // survit à loadMessages
  const reducers = useRef<Map<string, StreamReducer>>(new Map());
  const activeRef = useRef<string | null>(null);
  activeRef.current = activeId;

  const socket = useBrokerSocket(useCallback(() => client.connectWebSocket(), [client]));

  const api = useMemo(() => ({
    async json<T>(path: string, options?: RequestInit): Promise<T | null> {
      try { const r = await client.fetch(path, options); if (!r.ok) return null; return (await r.json()) as T; } catch { return null; }
    },
  }), [client]);

  const loadSessions = useCallback(async () => {
    const d = await api.json<{ sessions: ChatSessionDTO[] }>('/api/broker/sessions');
    if (d?.sessions) setSessions(d.sessions.map(dtoToSession));
  }, [api]);

  const loadMessages = useCallback(async (sid: string) => {
    const d = await api.json<{ messages: ChatMessageDTO[] }>(`/api/broker/sessions/${sid}/messages`);
    setBaseMessages((d?.messages ?? []).map(dtoToMessage));
  }, [api]);

  useEffect(() => { loadSessions(); }, [loadSessions]);

  // frames WS de la session active → reducer → état live
  useEffect(() => {
    return socket.onFrame((f: Frame) => {
      if (f.sessionId && f.sessionId !== activeRef.current) return; // isolation par-session
      if (f.type === 'session_event') {
        const r = reducers.current.get(f.sessionId!) ?? new StreamReducer(() => {});
        reducers.current.set(f.sessionId!, r);
        const ev = f.data as RawEvent;
        setStreaming(true);
        setActivity({ label: activityFor(ev), since: Date.now() });
        const res = r.apply(ev);
        setLive({ ...r.render() });
        if (res === 'terminal') finalize(f.sessionId!);
        // erreur véhiculée sur le WS aussi → message clair
        if (ev.type === 'error') setLiveError(humanizeError(ev.content as string | undefined));
      } else if (f.type === 'session_attached') {
        setStreaming(true);
      } else if (f.type === 'session_stream_closed') {
        finalize(f.sessionId!);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket]);

  const finalize = useCallback((sid: string) => {
    reducers.current.delete(sid);
    setLive(null); setStreaming(false); setActivity(null);
    if (sid === activeRef.current) { loadMessages(sid); }
    loadSessions();
  }, [loadMessages, loadSessions]);

  // Finalisation de secours quand le run se termine par une erreur SSE (le WS
  // n'émet pas toujours session_stream_closed dans ce cas).
  const finalizeSoft = useCallback(() => { setStreaming(false); setActivity(null); }, []);
  // Erreur affichée dans le fil. État séparé pour ne pas être écrasé par
  // loadMessages (qui recharge les messages persistés du serveur).
  const pushError = useCallback((sid: string, content: string) => {
    if (sid !== activeRef.current) return;
    setLiveError(content); setLive(null); setStreaming(false); setActivity(null);
  }, []);

  const select = useCallback((id: string) => {
    setActiveId(id); setLive(null); setStreaming(false); setActivity(null); setLiveError(null);
    loadMessages(id);
    socket.subscribe(id);
  }, [loadMessages, socket]);

  const send = useCallback(async (text: string) => {
    let sid = activeId;
    if (!sid) {
      const created = await api.json<{ session: ChatSessionDTO }>('/api/broker/sessions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model: DEFAULT_MODEL, taskforceModelProvider: DEFAULT_TF_PROVIDER }) });
      if (!created?.session) return;
      sid = created.session.id;
      setSessions((s) => [dtoToSession(created.session), ...s]);
      setActiveId(sid); activeRef.current = sid; socket.subscribe(sid);
    }
    // message utilisateur optimiste
    setLiveError(null);
    setBaseMessages((m) => [...m, { id: 'temp-' + Date.now(), role: 'user', segments: [{ kind: 'text', content: text }] }]);
    setStreaming(true); setActivity({ label: 'démarre', since: Date.now() });
    // POST /messages : le WS écrit les segments live. Mais on PARSE quand même
    // le corps SSE pour les side-effects que le WS ne porte pas toujours —
    // notamment `error` (sinon échec silencieux) et `done` (finalisation de
    // secours si le WS n'a pas émis session_stream_closed).
    try {
      const r = await client.fetch(`/api/broker/sessions/${sid}/messages`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: text, language: 'fr', progressMode: 'default', taskforceModelProvider: DEFAULT_TF_PROVIDER, requestId: 'r' + Date.now() }) });
      if (r.status === 402) { pushError(sid, 'Crédits insuffisants pour lancer ce projet.'); finalizeSoft(); return; }
      if (r.body) {
        const reader = r.body.getReader(); const dec = new TextDecoder(); let buf = '';
        for (;;) {
          const { value, done } = await reader.read(); if (done) break;
          buf += dec.decode(value, { stream: true });
          let nl: number;
          while ((nl = buf.indexOf('\n')) >= 0) {
            const line = buf.slice(0, nl).trim(); buf = buf.slice(nl + 1);
            if (!line.startsWith('data:')) continue;
            let ev: { type?: string; content?: string }; try { ev = JSON.parse(line.slice(5).trim()); } catch { continue; }
            if (ev.type === 'error') { pushError(sid, humanizeError(ev.content)); }
          }
        }
      }
    } catch { /* le WS reste la source de vérité */ }
    finalizeSoft();
  }, [activeId, api, client, socket]);

  const stop = useCallback(async () => {
    if (activeId) await client.fetch(`/api/broker/cancel/${activeId}`, { method: 'POST' }).catch(() => {});
    setStreaming(false); setActivity(null);
  }, [activeId, client]);

  const newProject = useCallback(() => { setActiveId(null); setBaseMessages([]); setLive(null); setStreaming(false); setActivity(null); }, []);

  // messages affichés = persistés + message assistant live en cours
  const messages: Message[] = useMemo(() => {
    const out = [...baseMessages];
    if (live && (live.segments.length || live.thinking)) {
      const liveSegs: Segment[] = [];
      if (live.thinking) liveSegs.push({ kind: 'thinking', content: live.thinking });
      liveSegs.push(...live.segments);
      out.push({ id: 'live', role: 'assistant', segments: liveSegs });
    }
    if (liveError) out.push({ id: 'liveError', role: 'assistant', segments: [{ kind: 'error', content: liveError }] });
    return out;
  }, [baseMessages, live, liveError]);

  return { sessions, activeId, messages, streaming, activity, socketStatus: socket.status, select, newProject, send, stop, reloadSessions: loadSessions };
}
