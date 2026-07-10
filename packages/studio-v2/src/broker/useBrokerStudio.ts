// Orchestrateur : branche le shell sur le broker (REST + WS + reducer).
// Respecte les invariants du contrat : le WS est le SEUL writer de l'état live;
// le POST /messages est draîné (backpressure broker) mais n'écrit rien;
// session_stream_closed est autoritaire pour finaliser.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Activity, FileNode, Message, Segment, Session } from '../lib/types';
import type { BrokerClient } from './client';
import { useBrokerSocket, type Frame } from './socket';
import { StreamReducer, choiceFromInput, type RawEvent } from './reducer';
import { DEFAULT_MODEL_ID } from '../lib/models';
import { stringsFor, type Strings } from '../lib/i18n';

interface ChatSessionDTO { id: string; title: string | null; model: string; isProcessing?: boolean; createdAt: number; updatedAt: number; }
interface ChatMessageDTO { id: string; role: string; content?: string; thinking?: string; tools?: Array<{ name: string; input?: unknown; done?: boolean }>; files?: Array<{ name: string; url: string; mimeType?: string }>; createdAt: number; }

function dtoToSession(d: ChatSessionDTO): Session {
  return { id: d.id, title: d.title || 'Sans titre', status: d.isProcessing ? 'running' : 'idle', model: d.model, updatedAt: d.updatedAt || d.createdAt || 0 };
}
// Le message assistant persisté stocke ses segments comme un tableau JSON
// SÉRIALISÉ dans `content` (ex: '[{"type":"text",...},{"type":"tool",...}]').
// Le message user a un `content` texte simple. On gère les deux.
function elToSegment(e: { type?: string; content?: string; name?: string; input?: unknown; done?: boolean; url?: string; mimeType?: string }): Segment | null {
  switch (e.type) {
    case 'text': return { kind: 'text', content: e.content ?? '' };
    case 'thinking': return { kind: 'thinking', content: e.content ?? '' };
    case 'tool': {
      if (e.name === 'ask_choice') { const c = choiceFromInput(e.input); if (c) return c; }
      return { kind: 'tool', name: e.name ?? 'tool', input: e.input ? JSON.stringify(e.input).slice(0, 200) : undefined, done: e.done ?? true };
    }
    case 'choice': return choiceFromInput(e);
    case 'file': return { kind: 'file', name: e.name ?? 'fichier', url: e.url ?? '', mimeType: e.mimeType };
    case 'error': return { kind: 'error', content: e.content ?? 'Erreur' };
    default: return null; // widget / choice / progress : gérés plus tard
  }
}
function parseContent(content?: string): Segment[] {
  if (!content) return [];
  const t = content.trim();
  if (t.startsWith('[')) {
    try {
      const arr = JSON.parse(t);
      if (Array.isArray(arr)) return arr.map(elToSegment).filter((s): s is Segment => s !== null);
    } catch { /* pas du JSON → texte brut */ }
  }
  return [{ kind: 'text', content }];
}
function dtoToMessage(d: ChatMessageDTO): Message {
  const segments: Segment[] = [];
  if (d.thinking) segments.push({ kind: 'thinking', content: d.thinking });
  for (const t of d.tools ?? []) segments.push({ kind: 'tool', name: t.name, input: t.input ? JSON.stringify(t.input).slice(0, 200) : undefined, done: t.done ?? true });
  segments.push(...parseContent(d.content));
  for (const f of d.files ?? []) segments.push({ kind: 'file', name: f.name, url: f.url, mimeType: f.mimeType });
  return { id: d.id, role: d.role === 'user' ? 'user' : 'assistant', segments };
}

// Taskforce (build) sur openai : le broker's Anthropic est souvent en 429.
const DEFAULT_TF_PROVIDER = 'openai';

/** Traduit une erreur backend brute en message clair pour l'utilisateur. */
function humanizeError(raw: string | undefined, e: Strings['errors']): string {
  const s = raw ?? '';
  if (/429|rate.?limit/i.test(s)) return e.rate;
  if (/402|credit/i.test(s)) return e.credits;
  if (/timeout|timed out/i.test(s)) return e.timeout;
  return e.generic;
}

function activityFor(ev: RawEvent, a: Strings['activity']): string {
  if (ev.type === 'compact') return a.compacting;
  if (ev.type === 'thinking') return a.thinking;
  if (ev.type === 'text') return a.writing;
  if (ev.type === 'tool_use') {
    const n = String(ev.name ?? '');
    const map: Record<string, string> = { Write: a.write, Edit: a.edit, Read: a.read, Bash: a.bash, Task: a.task };
    if (map[n]) return map[n];
    if (/^mcp__browser/.test(n)) return a.browser;
    if (/find-assets/.test(n)) return a.assets;
    return `${a.tool} ${n}`;
  }
  return a.working;
}

export function useBrokerStudio(client: BrokerClient, lang: string = 'en', brokerUrl: string = '') {
  const t = useMemo(() => stringsFor(lang), [lang]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [baseMessages, setBaseMessages] = useState<Message[]>([]); // persistés
  const [live, setLive] = useState<{ segments: Segment[]; thinking: string } | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [activity, setActivity] = useState<Activity | null>(null);
  const [liveError, setLiveError] = useState<string | null>(null); // survit à loadMessages
  const [tree, setTree] = useState<FileNode[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [model, setModel] = useState<string>(DEFAULT_MODEL_ID);
  const modelRef = useRef(model); modelRef.current = model;
  const [projectId, setProjectId] = useState<string | null>(null);
  const [publishUrl, setPublishUrl] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  // Fichiers en attente : gardés EN MÉMOIRE, uploadés seulement à l'envoi du
  // message (évite de créer une session/workspace vide juste pour un upload).
  const [pending, setPending] = useState<{ id: string; file: File }[]>([]);
  const [uploading, setUploading] = useState(false);
  const reducers = useRef<Map<string, StreamReducer>>(new Map());
  const activeRef = useRef<string | null>(null);
  activeRef.current = activeId;
  // Tour en cours: on n'accepte les frames WS (live) que pendant un tour actif.
  // Empêche les frames tardives de reconstruire le live APRÈS le chargement des
  // messages persistés → sinon doublons (live + persisté).
  const turnActive = useRef(false);

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
    const msgs = (d?.messages ?? []).map(dtoToMessage);
    // Un choix est VERROUILLÉ seulement si un message utilisateur le suit
    // (déjà répondu). S'il est le dernier sans réponse, il reste répondable.
    for (let i = 0; i < msgs.length; i++) {
      const answered = msgs.slice(i + 1).some((m) => m.role === 'user');
      for (const s of msgs[i].segments) if (s.kind === 'choice') s.answered = answered;
    }
    setLive(null); // les messages persistés font foi → pas de doublon live
    setBaseMessages(msgs);
  }, [api]);

  useEffect(() => { loadSessions(); }, [loadSessions]);

  // Preview + file-tree : poll workspace-tree de la session active (contrat §4).
  const HIDDEN = new Set(['node_modules', '.pnpm-store', '.git', '.claude']);
  const mapNode = useCallback((n: { name: string; path: string; type?: string; size?: number; children?: unknown[] }): FileNode => {
    const dir = n.type === 'directory' || Array.isArray(n.children);
    const collapsed = dir && HIDDEN.has(n.name);
    return { name: n.name, path: n.path, dir, size: n.size, collapsed, children: collapsed ? undefined : (n.children as typeof n[])?.map(mapNode) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const refreshTree = useCallback(async () => {
    const sid = activeRef.current;
    if (!sid) { setTree([]); setPreviewUrl(null); return; }
    const d = await api.json<{ tree?: { name: string; path: string; type?: string; size?: number; children?: unknown[] }[]; projectId?: string; flowProjectId?: string }>(`/api/broker/workspace-tree/${sid}`);
    if (sid !== activeRef.current) return;
    if (d?.tree) setTree(d.tree.map(mapNode));
    const pid = d?.flowProjectId || d?.projectId || null;
    setProjectId(pid);
    setPreviewUrl(pid ? `/api/broker/project/${pid}/iframe` : null);
  }, [api, mapNode]);

  // Publish : état courant du déploiement de la session active.
  useEffect(() => {
    if (!projectId) { setPublishUrl(null); return; }
    let stop = false;
    api.json<{ subdomainUrl?: string | null }>(`/api/broker/project/${projectId}/publish`).then((d) => { if (!stop) setPublishUrl(d?.subdomainUrl ?? null); });
    return () => { stop = true; };
  }, [projectId, api]);

  const publish = useCallback(async () => {
    if (!projectId) return;
    setPublishing(true);
    const slug = (sessions.find((s) => s.id === activeRef.current)?.title || 'kalit')
      .toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'kalit';
    const r = await client.fetch(`/api/broker/project/${projectId}/publish`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'subdomain', slug }) }).catch(() => null);
    if (r && r.ok) { const d = await r.json().catch(() => null); setPublishUrl((d?.data ?? d)?.subdomainUrl ?? null); }
    setPublishing(false);
  }, [projectId, client, sessions]);
  useEffect(() => {
    if (!activeId) { setTree([]); setPreviewUrl(null); return; }
    refreshTree();
    const t = setInterval(refreshTree, 5000);
    return () => clearInterval(t);
  }, [activeId, refreshTree]);

  // frames WS de la session active → reducer → état live
  useEffect(() => {
    return socket.onFrame((f: Frame) => {
      if (f.sessionId && f.sessionId !== activeRef.current) return; // isolation par-session
      if (f.type === 'session_event') {
        if (!turnActive.current) return; // frame tardive après fin de tour → ignorer
        const r = reducers.current.get(f.sessionId!) ?? new StreamReducer(() => {});
        reducers.current.set(f.sessionId!, r);
        const ev = f.data as RawEvent;
        setStreaming(true);
        setActivity({ label: activityFor(ev, t.activity), since: Date.now() });
        const res = r.apply(ev);
        setLive({ ...r.render() });
        if (res === 'terminal') finalize(f.sessionId!);
        // erreur véhiculée sur le WS aussi → message clair
        if (ev.type === 'error') setLiveError(humanizeError(ev.content as string | undefined, t.errors));
      } else if (f.type === 'session_attached') {
        // Reprise d'une session active (switch/reload) : ré-accepter les frames
        // live et montrer l'activité immédiatement.
        turnActive.current = true;
        setStreaming(true);
        setActivity((a) => a ?? { label: t.activity.working, since: Date.now() });
      } else if (f.type === 'session_stream_closed') {
        finalize(f.sessionId!);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket]);

  const finalize = useCallback((sid: string) => {
    turnActive.current = false;
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
    // activeRef mis à jour SYNCHRONEMENT : sur une re-souscription (curseur > 0),
    // le broker envoie session_attached immédiatement (sans session_context) —
    // si activeRef pointait encore sur l'ancienne session, la frame serait
    // filtrée et l'activité ne réapparaîtrait pas.
    activeRef.current = id;
    // Session déjà en cours de génération (switch/reload) : on ré-accepte les
    // frames WS live pour ré-afficher l'activité de l'agent au lieu de rester figé.
    const running = sessions.find((x) => x.id === id)?.status === 'running';
    turnActive.current = running;
    setActiveId(id); setLive(null); setLiveError(null);
    setStreaming(running);
    setActivity(running ? { label: t.activity.working, since: Date.now() } : null);
    loadMessages(id);
    socket.subscribe(id);
  }, [loadMessages, socket, sessions, t]);

  // Crée la session à la volée si besoin (upload ou 1er message).
  const ensureSession = useCallback(async (): Promise<string | null> => {
    if (activeRef.current) return activeRef.current;
    const created = await api.json<{ session: ChatSessionDTO }>('/api/broker/sessions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model: modelRef.current, taskforceModelProvider: DEFAULT_TF_PROVIDER }) });
    if (!created?.session) return null;
    const sid = created.session.id;
    setSessions((s) => [dtoToSession(created.session), ...s]);
    setActiveId(sid); activeRef.current = sid; socket.subscribe(sid);
    return sid;
  }, [api, socket]);

  // Ajoute des fichiers à la file d'attente (rien n'est encore uploadé).
  const addFiles = useCallback((files: File[]) => {
    const list = files.filter((f) => f.size <= 10 * 1024 * 1024);
    if (!list.length) return;
    setPending((p) => [...p, ...list.map((f, i) => ({ id: 'f' + Date.now() + '-' + i + '-' + f.size, file: f }))]);
  }, []);

  const removeAttachment = useCallback((id: string) => setPending((p) => p.filter((x) => x.id !== id)), []);

  // Upload des fichiers dans le workspace de la session (à l'envoi). Va DIRECT au
  // broker public (CORS ouvert) — le rewrite Next bufferise mal les gros
  // multipart (images) et fait traîner/planter la requête. Lève en cas d'échec
  // pour ne PAS prétendre à tort que les fichiers sont là.
  const uploadPending = useCallback(async (sid: string, items: { id: string; file: File }[]): Promise<string[]> => {
    if (!items.length) return [];
    setUploading(true);
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 120000);
    try {
      const fd = new FormData();
      fd.append('sessionId', sid);
      fd.append('category', 'assets');
      for (const it of items) fd.append('files', it.file);
      const url = (brokerUrl ? brokerUrl.replace(/\/+$/, '') : '') + '/api/flow/upload';
      const r = await client.fetch(brokerUrl ? url : '/api/broker/upload', { method: 'POST', body: fd, signal: ctl.signal });
      if (!r.ok) throw new Error('upload ' + r.status);
      return items.map((it) => it.file.name);
    } finally {
      clearTimeout(timer);
      setUploading(false);
    }
  }, [client, brokerUrl]);

  const send = useCallback(async (text: string) => {
    const items = pending;
    if (!text.trim() && !items.length) return;
    const sid = await ensureSession();
    if (!sid) return;
    setPending([]);
    // Feedback immédiat : message optimiste + activité, AVANT l'upload (sinon
    // l'UI paraît figée le temps du téléversement).
    turnActive.current = true;
    setLiveError(null);
    setBaseMessages((m) => [...m, { id: 'temp-' + Date.now(), role: 'user', segments: [{ kind: 'text', content: text || (items.length ? '(fichiers joints)' : '') }] }]);
    setStreaming(true); setActivity({ label: items.length ? t.activity.uploading : t.activity.starting, since: Date.now() });
    // Upload d'abord — le worker doit voir les fichiers. Échec → on stoppe et on
    // le dit (pas de faux « fichiers joints »).
    let names: string[] = [];
    if (items.length) {
      try { names = await uploadPending(sid, items); }
      catch { pushError(sid, t.errors.upload); return; }
    }
    const body = names.length
      ? `[${names.length} fichier(s) joint(s) par l'utilisateur, disponibles dans ./attachments/ : ${names.join(', ')}]\n\n${text}`
      : text;
    setActivity({ label: t.activity.starting, since: Date.now() });
    // POST /messages : le WS écrit les segments live. Mais on PARSE quand même
    // le corps SSE pour les side-effects que le WS ne porte pas toujours —
    // notamment `error` (sinon échec silencieux) et `done` (finalisation de
    // secours si le WS n'a pas émis session_stream_closed).
    try {
      const r = await client.fetch(`/api/broker/sessions/${sid}/messages`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: body, language: lang, progressMode: 'default', suite: 'project', taskforceModelProvider: DEFAULT_TF_PROVIDER, requestId: 'r' + Date.now() }) });
      if (r.status === 402) { pushError(sid, t.errors.credits); finalizeSoft(); return; }
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
            if (ev.type === 'error') { pushError(sid, humanizeError(ev.content, t.errors)); }
          }
        }
      }
    } catch { /* le WS reste la source de vérité */ }
    turnActive.current = false;   // tour terminé côté POST → plus de live
    finalizeSoft();
    if (sid) loadMessages(sid);   // sync l'état persisté (ex: QCM en attente de réponse)
  }, [pending, ensureSession, uploadPending, pushError, client, lang]);

  const stop = useCallback(async () => {
    if (activeId) await client.fetch(`/api/broker/cancel/${activeId}`, { method: 'POST' }).catch(() => {});
    setStreaming(false); setActivity(null);
  }, [activeId, client]);

  const newProject = useCallback(() => { setActiveId(null); setBaseMessages([]); setLive(null); setStreaming(false); setActivity(null); setPending([]); }, []);

  // messages affichés = persistés + message assistant live en cours
  const messages: Message[] = useMemo(() => {
    const out = [...baseMessages];
    if (streaming && live && (live.segments.length || live.thinking)) {
      const liveSegs: Segment[] = [];
      if (live.thinking) liveSegs.push({ kind: 'thinking', content: live.thinking });
      liveSegs.push(...live.segments);
      out.push({ id: 'live', role: 'assistant', segments: liveSegs });
    }
    if (liveError) out.push({ id: 'liveError', role: 'assistant', segments: [{ kind: 'error', content: liveError }] });
    return out;
  }, [baseMessages, live, liveError, streaming]);

  const attachments = pending.map((p) => ({ id: p.id, name: p.file.name }));
  return { sessions, activeId, messages, streaming, activity, tree, previewUrl, model, publishUrl, publishing, canPublish: !!projectId, attachments, uploading, addFiles, removeAttachment, socketStatus: socket.status, select, newProject, send, stop, setModel, publish, refreshTree, reloadSessions: loadSessions };
}
