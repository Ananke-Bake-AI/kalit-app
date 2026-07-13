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

export interface DnsRecord { type: string; name: string; value: string; }
export interface DomainState { customDomain: string | null; status: string | null; dnsRecords: DnsRecord[] | null; }
export interface PublishResult { phase: 'ok' | 'too_large' | 'error'; url?: string | null; sizeBytes?: number; limitBytes?: number; }
interface PublishInfo { subdomainUrl?: string | null; customDomain?: string | null; customDomainStatus?: string | null; }

interface ChatSessionDTO { id: string; title: string | null; model: string; isProcessing?: boolean; createdAt: number; updatedAt: number; projectId?: string; projectDeployed?: boolean; }
interface ChatMessageDTO { id: string; role: string; content?: string; thinking?: string; tools?: Array<{ name: string; input?: unknown; done?: boolean }>; files?: Array<{ name: string; url: string; mimeType?: string }>; createdAt: number; }

function dtoToSession(d: ChatSessionDTO): Session {
  return { id: d.id, title: d.title || 'Sans titre', status: d.isProcessing ? 'running' : 'idle', model: d.model, updatedAt: d.updatedAt || d.createdAt || 0, projectId: d.projectId, projectDeployed: d.projectDeployed };
}
// Le message assistant persisté stocke ses segments comme un tableau JSON
// SÉRIALISÉ dans `content` (ex: '[{"type":"text",...},{"type":"tool",...}]').
// Le message user a un `content` texte simple. On gère les deux.
function elToSegment(e: { type?: string; content?: string; name?: string; input?: unknown; done?: boolean; url?: string; mimeType?: string; credits?: number; tokens?: number; inputTokens?: number; outputTokens?: number; cacheReadTokens?: number; cacheCreationTokens?: number; durationMs?: number }): Segment | null {
  switch (e.type) {
    case 'text': return { kind: 'text', content: e.content ?? '' };
    case 'thinking': return { kind: 'thinking', content: e.content ?? '' };
    case 'tool': {
      if (e.name === 'ask_choice') { const c = choiceFromInput(e.input); if (c) return c; }
      const full = e.input ? JSON.stringify(e.input) : undefined;
      return { kind: 'tool', name: e.name ?? 'tool', input: full?.slice(0, 200), inputFull: full?.slice(0, 20000), done: e.done ?? true };
    }
    case 'refinement': return { kind: 'refinement', content: e.content ?? '' };
    case 'turn_stats': return { kind: 'stats', credits: e.credits ?? 0, tokens: e.tokens ?? 0, inputTokens: e.inputTokens ?? 0, outputTokens: e.outputTokens ?? 0, cacheReadTokens: e.cacheReadTokens ?? 0, cacheCreationTokens: e.cacheCreationTokens ?? 0, durationMs: e.durationMs ?? 0 };
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
// Le refinement (« prompt affiné ») précède le travail de l'agent → il doit
// s'afficher AVANT le thinking/les tools, même si le thinking est accumulé à
// part et poussé en tête. On remonte donc les segments 'refinement' en premier.
function hoistRefinement(segs: Segment[]): Segment[] {
  const refine = segs.filter((s) => s.kind === 'refinement');
  return refine.length ? [...refine, ...segs.filter((s) => s.kind !== 'refinement')] : segs;
}

function dtoToMessage(d: ChatMessageDTO): Message {
  const segments: Segment[] = [];
  if (d.thinking) segments.push({ kind: 'thinking', content: d.thinking });
  for (const t of d.tools ?? []) { const full = t.input ? JSON.stringify(t.input) : undefined; segments.push({ kind: 'tool', name: t.name, input: full?.slice(0, 200), inputFull: full?.slice(0, 20000), done: t.done ?? true }); }
  segments.push(...parseContent(d.content));
  for (const f of d.files ?? []) segments.push({ kind: 'file', name: f.name, url: f.url, mimeType: f.mimeType });
  return { id: d.id, role: d.role === 'user' ? 'user' : 'assistant', segments: hoistRefinement(segments) };
}

// Taskforce (build) sur openai : le broker's Anthropic est souvent en 429.
const DEFAULT_TF_PROVIDER = 'openai';

// Nom de pièce jointe sûr à référencer par l'agent. Un fichier déposé depuis un
// Mac arrive en Unicode NFD (accents décomposés : é = e + ◌́) et avec des
// apostrophes courbes (« Capture d’écran… »). Le broker sauvegarde le fichier
// SOUS CE NOM EXACT, mais le LLM recompose/normalise le chemin quand il le
// recopie dans un Read (’→', NFD→NFC) → ENOENT, il ne « voit » pas le screenshot.
// On translittère donc en ASCII simple ([A-Za-z0-9._-]) et on se sert du MÊME nom
// pour le multipart (donc le nom sur disque) ET pour la référence injectée dans
// le message → l'agent lit ./attachments/<nom> sans ambiguïté.
function safeAttachmentName(name: string): string {
  const dot = name.lastIndexOf('.');
  const ext = dot > 0 ? name.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, '') : '';
  const base = (dot > 0 ? name.slice(0, dot) : name)
    .normalize('NFKD').replace(/[̀-ͯ]/g, '') // enlève les accents combinants
    .replace(/[‘’“”'"`]/g, '')     // enlève apostrophes/guillemets courbes
    .replace(/[^A-Za-z0-9._-]+/g, '_')                 // espaces & autres → _
    .replace(/_+/g, '_').replace(/^[_.-]+|[_.-]+$/g, '');
  const safeBase = base || 'file';
  return ext ? `${safeBase}.${ext}` : safeBase;
}

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
  // Modèle : init DEFAULT (SSR-safe), puis on charge la dernière sélection
  // sauvegardée en localStorage au mount. setModel (exposé à l'UI) persiste ;
  // setModelState (interne) sert juste à refléter le modèle d'une session.
  const [model, setModelState] = useState<string>(DEFAULT_MODEL_ID);
  const modelRef = useRef(model); modelRef.current = model;
  useEffect(() => {
    try { const s = localStorage.getItem('kalit.studio.model'); if (s) setModelState(s); } catch { /* ignore */ }
  }, []);
  const setModel = useCallback((id: string) => {
    setModelState(id);
    try { localStorage.setItem('kalit.studio.model', id); } catch { /* ignore */ }
  }, []);
  // Mode Precision (opt-in) : contrat + QA visuelle 2-étages côté worker. Coûteux
  // en tokens → off par défaut ; le broker l'enforce Pro+/admin quoi qu'il arrive.
  const [precision, setPrecisionState] = useState<boolean>(false);
  const precisionRef = useRef(precision); precisionRef.current = precision;
  useEffect(() => {
    try { if (localStorage.getItem('kalit.studio.precision') === '1') setPrecisionState(true); } catch { /* ignore */ }
  }, []);
  const setPrecision = useCallback((on: boolean) => {
    setPrecisionState(on);
    try { localStorage.setItem('kalit.studio.precision', on ? '1' : '0'); } catch { /* ignore */ }
  }, []);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [publishUrl, setPublishUrl] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState<PublishResult | null>(null); // résultat du dernier publish (modal)
  const [deployBlocked, setDeployBlocked] = useState(false); // backend project → publish refused (modal)
  const [storageBlocked, setStorageBlocked] = useState(false); // quota plein → nouvelle création refusée (modal)
  const [storage, setStorage] = useState<{ usedBytes: number; limitBytes: number } | null>(null);
  const [domain, setDomain] = useState<DomainState>({ customDomain: null, status: null, dnsRecords: null });
  const [downloading, setDownloading] = useState(false);
  const [ctxPercent, setCtxPercent] = useState<number | null>(null); // remplissage du contexte (jauge live)
  // Fichiers en attente : gardés EN MÉMOIRE, uploadés seulement à l'envoi du
  // message (évite de créer une session/workspace vide juste pour un upload).
  const [pending, setPending] = useState<{ id: string; file: File }[]>([]);
  const [uploading, setUploading] = useState(false);
  // Crédits épuisés : le broker refuse le tour en 402 → bannière + CTA upgrade.
  const [outOfCredits, setOutOfCredits] = useState(false);
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

  // Jauge de stockage du compte (usage + cap du plan). Rafraîchie au montage et
  // après chaque tour (l'archive R2 grandit) → bannière ≥80%, modal à 100%.
  const loadStorage = useCallback(async () => {
    const d = await api.json<{ usedBytes: number; limitBytes: number }>('/api/broker/storage');
    if (d && typeof d.limitBytes === 'number') setStorage({ usedBytes: d.usedBytes || 0, limitBytes: d.limitBytes });
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
    // Les messages persistés font foi. MAIS si un tour est en cours pour cette
    // session (reducer vivant), on ré-affiche son contenu live au lieu de nuller
    // (sinon le fetch async écraserait le live restauré au switch → écran figé).
    const rr = reducers.current.get(sid);
    setLive(rr ? { ...rr.render() } : null);
    setBaseMessages(msgs);
  }, [api]);

  useEffect(() => { loadSessions(); loadStorage(); }, [loadSessions, loadStorage]);

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

  // Publish + custom domain : état courant du déploiement de la session active.
  useEffect(() => {
    if (!projectId) { setPublishUrl(null); setDomain({ customDomain: null, status: null, dnsRecords: null }); return; }
    let stop = false;
    api.json<{ data?: PublishInfo } & PublishInfo>(`/api/broker/project/${projectId}/publish`).then((raw) => {
      if (stop) return;
      const d = raw?.data ?? raw;
      setPublishUrl(d?.subdomainUrl ?? null);
      setDomain((prev) => ({ customDomain: d?.customDomain ?? null, status: d?.customDomainStatus ?? null, dnsRecords: prev.dnsRecords }));
    });
    return () => { stop = true; };
  }, [projectId, api]);

  // Tant que le domaine est "pending", on re-poll le GET publish (le broker
  // re-vérifie côté Vercel et bascule en "active" quand le DNS a propagé).
  useEffect(() => {
    if (!projectId || domain.status !== 'pending') return;
    let stop = false;
    const iv = setInterval(() => {
      api.json<{ data?: PublishInfo } & PublishInfo>(`/api/broker/project/${projectId}/publish`).then((raw) => {
        if (stop) return;
        const d = raw?.data ?? raw;
        setDomain((prev) => ({ ...prev, customDomain: d?.customDomain ?? null, status: d?.customDomainStatus ?? null }));
      });
    }, 15000);
    return () => { stop = true; clearInterval(iv); };
  }, [projectId, domain.status, api]);

  const publish = useCallback(async () => {
    if (!projectId) return;
    setPublishing(true);
    const slug = (sessions.find((s) => s.id === activeRef.current)?.title || 'kalit')
      .toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'kalit';
    setPublishResult(null);
    const r = await client.fetch(`/api/broker/project/${projectId}/publish`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'subdomain', slug }) }).catch(() => null);
    if (r && r.ok) {
      const d = await r.json().catch(() => null);
      const url = (d?.data ?? d)?.subdomainUrl ?? null;
      setPublishUrl(url);
      setPublishResult({ phase: 'ok', url });
    }
    // 422 = backend project → publishing is front-end only for now.
    else if (r && r.status === 422) { setDeployBlocked(true); }
    // 413 = site over Vercel's 10 MB upload limit → show the size explicitly.
    else if (r && r.status === 413) {
      const j = await r.json().catch(() => null);
      setPublishResult({ phase: 'too_large', sizeBytes: j?.sizeBytes, limitBytes: j?.limitBytes });
    }
    else { setPublishResult({ phase: 'error' }); }
    setPublishing(false);
  }, [projectId, client, sessions]);

  // Custom domain : lier le domaine de l'user au site publié (le broker
  // l'attache au projet Vercel + renvoie les DNS à configurer, statut pending
  // jusqu'à ce que Vercel vérifie). Retourne l'erreur éventuelle pour l'UI.
  const connectDomain = useCallback(async (dom: string): Promise<{ ok: boolean; error?: string }> => {
    if (!projectId) return { ok: false };
    const r = await client.fetch(`/api/broker/project/${projectId}/publish`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'connect-domain', domain: dom }) }).catch(() => null);
    const j = r ? await r.json().catch(() => null) : null;
    if (r && r.ok && j?.data) {
      setDomain({ customDomain: j.data.domain ?? dom, status: j.data.status ?? 'pending', dnsRecords: j.data.dnsRecords ?? null });
      return { ok: true };
    }
    return { ok: false, error: j?.error };
  }, [projectId, client]);

  const removeDomain = useCallback(async () => {
    if (!projectId) return;
    await client.fetch(`/api/broker/project/${projectId}/publish`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'remove-domain' }) }).catch(() => {});
    setDomain({ customDomain: null, status: null, dnsRecords: null });
  }, [projectId, client]);

  // Download ZIP du projet. Passe par la route Next /api/repositories/<id>/download
  // (auth NextAuth côté serveur + stream fiable) → blob → téléchargement navigateur.
  const download = useCallback(async () => {
    if (!projectId || downloading) return;
    setDownloading(true);
    try {
      const r = await fetch(`/api/repositories/${projectId}/download`);
      if (!r.ok) { setLiveError(r.status === 429 ? t.errors.rate : t.errors.generic); return; }
      const blob = await r.blob();
      const href = URL.createObjectURL(blob);
      const slug = (sessions.find((s) => s.id === activeRef.current)?.title || 'project')
        .toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'project';
      const a = document.createElement('a');
      a.href = href; a.download = slug + '.zip';
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(href);
    } catch { setLiveError(t.errors.generic); }
    finally { setDownloading(false); }
  }, [projectId, downloading, sessions, t]);
  useEffect(() => {
    if (!activeId) { setTree([]); setPreviewUrl(null); return; }
    refreshTree();
    const t = setInterval(refreshTree, 5000);
    return () => clearInterval(t);
  }, [activeId, refreshTree]);

  // frames WS de la session active → reducer → état live
  useEffect(() => {
    return socket.onFrame((f: Frame) => {
      // MULTI-SESSION : on alimente TOUJOURS le reducer de la session concernée,
      // même en arrière-plan — sinon la session A gèle quand on regarde B et son
      // contenu streamé est perdu au retour (bug historique). On ne met à jour
      // l'état live AFFICHÉ (live/streaming/activity/ctx) QUE pour la session
      // active. (Le broker n'émet plus de session_stream_closed parasite à la
      // re-souscription — corrigé côté serveur, cf. bridgeRoomToWS.)
      const isActive = !f.sessionId || f.sessionId === activeRef.current;
      if (f.type === 'session_event') {
        const ev = f.data as RawEvent;
        // Event "context" : jauge de remplissage — pertinent seulement affiché.
        if (ev.type === 'context') {
          if (isActive) {
            const p = (ev as { percent?: number }).percent;
            if (typeof p === 'number') setCtxPercent(p);
          }
          return;
        }
        const r = reducers.current.get(f.sessionId!) ?? new StreamReducer(() => {});
        reducers.current.set(f.sessionId!, r);
        const res = r.apply(ev);
        if (isActive) {
          turnActive.current = true;
          setStreaming(true);
          setActivity({ label: activityFor(ev, t.activity), since: Date.now() });
          setLive({ ...r.render() });
          if (ev.type === 'error') setLiveError(humanizeError(ev.content as string | undefined, t.errors));
        }
        if (res === 'terminal') finalize(f.sessionId!);
      } else if (f.type === 'session_attached') {
        // Reprise d'une session active (switch/reload) : montrer l'activité.
        if (isActive) {
          turnActive.current = true;
          setStreaming(true);
          setActivity((a) => a ?? { label: t.activity.working, since: Date.now() });
        }
      } else if (f.type === 'session_stream_closed') {
        finalize(f.sessionId!);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket]);

  const finalize = useCallback((sid: string) => {
    reducers.current.delete(sid);
    // N'affecte l'état live GLOBAL (turnActive/streaming/activity/live, uniques)
    // QUE si c'est la session affichée. Sinon une session qui finit en arrière-
    // plan (multi-session) couperait le live de la session active → plus de
    // thinking ni d'étiquette d'activité en temps réel.
    if (sid === activeRef.current) {
      turnActive.current = false;
      setLive(null); setStreaming(false); setActivity(null);
      loadMessages(sid);
    }
    loadSessions();
    // La taille R2 grandit après le tour (backup async côté broker) → on
    // rafraîchit la jauge avec un léger délai pour laisser le backup finir.
    setTimeout(() => { loadStorage(); }, 4000);
  }, [loadMessages, loadSessions, loadStorage]);

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
    // Session déjà en cours (switch/reload) : un reducer VIVANT pour cette session
    // = un tour en cours qu'on a suivi en arrière-plan. On restaure son live
    // IMMÉDIATEMENT (repaint instantané) au lieu de rester blanc jusqu'au prochain
    // event — c'était le cœur du bug « plus de suivi au retour sur la session ».
    const r = reducers.current.get(id);
    const running = !!r || sessions.find((x) => x.id === id)?.status === 'running';
    turnActive.current = running;
    setActiveId(id); setLive(r ? { ...r.render() } : null); setLiveError(null); setOutOfCredits(false);
    // Reflète le modèle réel de la session sélectionnée (sans écraser la
    // dernière sélection sauvegardée : un switch de session n'est pas un choix).
    const sm = sessions.find((x) => x.id === id)?.model;
    if (sm) setModelState(sm);
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
      // Noms ASCII sûrs (dédupliqués) — utilisés pour le multipart (= nom sur
      // disque) ET renvoyés pour la référence injectée dans le message, afin que
      // les deux coïncident exactement et soient lisibles par l'agent.
      const seen = new Set<string>();
      const safeNames = items.map((it) => {
        let n = safeAttachmentName(it.file.name);
        if (seen.has(n)) {
          const d = n.lastIndexOf('.'); const b = d > 0 ? n.slice(0, d) : n; const e = d > 0 ? n.slice(d) : '';
          let i = 2; while (seen.has(`${b}-${i}${e}`)) i++; n = `${b}-${i}${e}`;
        }
        seen.add(n); return n;
      });
      const fd = new FormData();
      fd.append('sessionId', sid);
      fd.append('category', 'assets');
      items.forEach((it, i) => fd.append('files', it.file, safeNames[i]));
      const url = (brokerUrl ? brokerUrl.replace(/\/+$/, '') : '') + '/api/flow/upload';
      const r = await client.fetch(brokerUrl ? url : '/api/broker/upload', { method: 'POST', body: fd, signal: ctl.signal });
      if (!r.ok) throw new Error('upload ' + r.status);
      return safeNames;
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
    setLiveError(null); setOutOfCredits(false);
    // /compact : compaction longue et silencieuse (le worker n'émet le marqueur
    // qu'à la FIN) → on montre « résume la conversation… » dès le départ, sinon
    // c'est un long "working" puis un flash à la fin.
    const isCompact = text.trim() === '/compact';
    const startLabel = isCompact ? t.activity.compacting : (items.length ? t.activity.uploading : t.activity.starting);
    setBaseMessages((m) => [...m, { id: 'temp-' + Date.now(), role: 'user', segments: [{ kind: 'text', content: text || (items.length ? '(fichiers joints)' : '') }] }]);
    setStreaming(true); setActivity({ label: startLabel, since: Date.now() });
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
    setActivity({ label: isCompact ? t.activity.compacting : t.activity.starting, since: Date.now() });
    // Titre de session : le broker le pose au DÉBUT du POST (troncature du 1er
    // message immédiatement, puis titre LLM propre ~1-3s plus tard, en async) et
    // ne le diffuse que sur l'ancien wsHub — le user-ws que ce studio écoute ne
    // porte aucune frame « titre/méta ». Sans ça la liste n'est rechargée qu'à la
    // fin du tour (finalize) : sur un build long, « Sans titre » reste tout du
    // long jusqu'à un reload manuel. On refetch donc peu après pour capter la
    // troncature puis le titre LLM sans attendre la fin du tour.
    setTimeout(() => { loadSessions(); }, 2500);
    setTimeout(() => { loadSessions(); }, 8000);
    // `sawDone` = le POST a reçu l'event terminal 'done'. S'il ne le voit PAS
    // (POST coupé par un timeout proxy sur un long tool call), on NE finalise
    // pas : sinon turnActive repasse false et le handler WS ignore toutes les
    // frames suivantes → gel du chat jusqu'au reload. Le WS reste alors seul
    // maître de la fin (session_stream_closed).
    let sawDone = false;
    // POST /messages : le WS écrit les segments live. Mais on PARSE quand même
    // le corps SSE pour les side-effects que le WS ne porte pas toujours —
    // notamment `error` (sinon échec silencieux) et `done` (finalisation de
    // secours si le WS n'a pas émis session_stream_closed).
    try {
      const r = await client.fetch(`/api/broker/sessions/${sid}/messages`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: body, language: lang, progressMode: 'default', suite: 'project', model: modelRef.current, precision: precisionRef.current, taskforceModelProvider: DEFAULT_TF_PROVIDER, requestId: 'r' + Date.now() }) });
      if (r.status === 402) { setOutOfCredits(true); finalizeSoft(); setBaseMessages((m) => m.filter((x) => !x.id.startsWith('temp-'))); return; }
      // 403 storage_limit : le broker refuse une NOUVELLE création (quota plein).
      if (r.status === 403) {
        const d = await r.json().catch(() => null);
        if (d?.error === 'storage_limit') { setStorageBlocked(true); finalizeSoft(); setBaseMessages((m) => m.filter((x) => !x.id.startsWith('temp-'))); return; }
      }
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
            if (ev.type === 'done') sawDone = true;
          }
        }
      }
    } catch { /* le WS reste la source de vérité */ }
    // On ne finalise QUE si le tour est réellement terminé (event 'done' vu).
    // POST coupé prématurément sans 'done' → laisser le WS piloter le live.
    if (sawDone) {
      reducers.current.delete(sid);
      // Multi-session : ne touche au live global QUE si cette session est
      // affichée. Sinon un tour qui finit en arrière-plan couperait le live de
      // la session active. On met juste à jour la liste (statut) dans tous les cas.
      if (sid === activeRef.current) {
        turnActive.current = false;
        finalizeSoft();
        loadMessages(sid);   // sync l'état persisté (ex: QCM en attente de réponse)
      }
      loadSessions();
    }
  }, [pending, ensureSession, uploadPending, pushError, client, lang, loadSessions]);

  const stop = useCallback(async () => {
    if (activeId) await client.fetch(`/api/broker/cancel/${activeId}`, { method: 'POST' }).catch(() => {});
    setStreaming(false); setActivity(null);
  }, [activeId, client]);

  const newProject = useCallback(() => { setActiveId(null); setBaseMessages([]); setLive(null); setStreaming(false); setActivity(null); setPending([]); setOutOfCredits(false); setCtxPercent(null); }, []);

  // Suppression d'une session. mode='session' → DELETE la session seule ; mode
  // ='project' → DELETE le projet lié (le broker cascade : deploy + archive R2 +
  // workspace + lignes DB + session). Optimiste : on la retire de la liste tout de
  // suite, et si c'était la session active on repart sur un écran vierge.
  const deleteSession = useCallback(async (id: string, mode: 'session' | 'project') => {
    const sess = sessions.find((x) => x.id === id);
    // mode='project' → tear the project down (rows + sessions + R2). Prefer the
    // project endpoint (it also purges the R2 archive), but when we don't know
    // the projectId fall back to the session endpoint WITH ?deleteProject=1 so
    // the broker still resolves + drops the project instead of orphaning it
    // (session-only delete would leave a draft on /repositories).
    const path = mode === 'project'
      ? (sess?.projectId
          ? `/api/broker/projects/${sess.projectId}`
          : `/api/broker/sessions/${id}?deleteProject=1`)
      : `/api/broker/sessions/${id}`;
    setSessions((list) => list.filter((x) => x.id !== id));
    if (activeRef.current === id) newProject();
    // Do NOT swallow failures: an errored/timed-out teardown used to look like
    // a success (optimistic removal) yet leave the project behind. Re-sync from
    // the server so a failed delete reappears in the list — honest state.
    let ok = false;
    try { const r = await client.fetch(path, { method: 'DELETE' }); ok = r.ok; } catch { ok = false; }
    await loadSessions();
    if (mode === 'project') loadStorage(); // deleting a project frees storage
    return ok;
  }, [sessions, client, loadSessions, loadStorage, newProject]);

  // Partage public read-only de la session active. action: 'share' crée/rafraîchit
  // le lien (snapshot au moment de l'appel), 'unshare' révoque. Renvoie le shareId.
  const shareSession = useCallback(async (action: 'share' | 'unshare'): Promise<{ shared: boolean; shareId?: string } | null> => {
    const id = activeRef.current;
    if (!id) return null;
    const d = await api.json<{ shared: boolean; shareId?: string }>(`/api/broker/sessions/${id}/share`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }),
    });
    return d;
  }, [api]);

  // messages affichés = persistés + message assistant live en cours
  const messages: Message[] = useMemo(() => {
    const out = [...baseMessages];
    if (streaming && live && (live.segments.length || live.thinking)) {
      const liveSegs: Segment[] = [];
      if (live.thinking) liveSegs.push({ kind: 'thinking', content: live.thinking });
      liveSegs.push(...live.segments);
      out.push({ id: 'live', role: 'assistant', segments: hoistRefinement(liveSegs) });
    }
    if (liveError) out.push({ id: 'liveError', role: 'assistant', segments: [{ kind: 'error', content: liveError }] });
    return out;
  }, [baseMessages, live, liveError, streaming]);

  const attachments = pending.map((p) => ({ id: p.id, name: p.file.name }));

  // Classification LIVE du prompt en cours d'écriture (halo du composer) : appelle
  // le MÊME classifieur que le prompt-boost côté broker. Renvoie none/enrich/rich.
  const checkPromptQuality = useCallback(async (text: string): Promise<'none' | 'enrich' | 'rich' | null> => {
    const t = text.trim();
    if (!t) return 'none';
    const d = await api.json<{ level?: string }>('/api/broker/prompt-quality', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: t }),
    });
    const lv = d?.level;
    return lv === 'enrich' || lv === 'rich' || lv === 'none' ? lv : null;
  }, [api]);

  return { sessions, activeId, messages, streaming, activity, ctxPercent, tree, previewUrl, model, publishUrl, publishing, publishResult, clearPublishResult: () => setPublishResult(null), deployBlocked, dismissDeployBlocked: () => setDeployBlocked(false), storage, storageBlocked, dismissStorageBlocked: () => setStorageBlocked(false), domain, connectDomain, removeDomain, canPublish: !!projectId, canDownload: !!projectId, downloading, attachments, uploading, outOfCredits, addFiles, removeAttachment, checkPromptQuality, socketStatus: socket.status, select, newProject, send, stop, deleteSession, setModel, precision, setPrecision, publish, download, refreshTree, reloadSessions: loadSessions, shareSession, canShare: !!activeId && messages.length > 0 };
}
