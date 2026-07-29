// Orchestrateur : branche le shell sur le broker (REST + WS + reducer).
// Respecte les invariants du contrat : le WS est le SEUL writer de l'état live;
// le POST /messages est draîné (backpressure broker) mais n'écrit rien;
// session_stream_closed est autoritaire pour finaliser.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Activity, FileNode, Message, Segment, Session } from '../lib/types';
import type { BrokerClient } from './client';
import { useBrokerSocket, type Frame } from './socket';
import { StreamReducer, choiceFromInput, type RawEvent } from './reducer';
import { DEFAULT_MODEL_ID, modelGroupsFor, type ModelGroup } from '../lib/models';
import { deriveActivity, hasFileActivity, flattenSizes } from '../lib/activity';
import { stringsFor, type Strings } from '../lib/i18n';
import { pushDataLayer } from '../lib/analytics';

export interface DnsRecord { type: string; name: string; value: string; }
export interface DomainState { customDomain: string | null; status: string | null; dnsRecords: DnsRecord[] | null; }
export interface PublishResult { phase: 'ok' | 'too_large' | 'error'; url?: string | null; sizeBytes?: number; limitBytes?: number; }
// Une invitation de partage de projet (collaboration à plusieurs). token = l'id
// de l'invite, url = le lien à envoyer, uses/maxUses = compteur d'acceptations.
export interface ProjectInvite { token: string; email: string; role: string; maxUses: number; uses: number; url: string; }
export interface GithubLink { connected: boolean; repoFullName?: string; defaultBranch?: string; mode?: string; authKind?: string; }
export interface GithubInstallation { installationId: string; accountLogin: string; accountType?: string; }
export interface GithubRepo { fullName: string; owner: string; defaultBranch: string; private: boolean; name?: string; description?: string | null; }
export interface PendingRepo { repoFullName: string; defaultBranch: string; installationId: string; }
export interface GithubApi {
  status: () => Promise<GithubLink | null>;
  installations: () => Promise<{ configured: boolean; installations: GithubInstallation[] }>;
  repos: (installationId: string) => Promise<GithubRepo[]>;
  connect: (opts: { repoFullName: string; defaultBranch: string; installationId: string }) => Promise<{ ok: boolean; error?: string }>;
  disconnect: () => Promise<boolean>;
  openPr: (opts?: { title?: string; body?: string }) => Promise<{ ok: boolean; message?: string; prUrl?: string; error?: string }>;
  installUrl: string;
}
interface PublishInfo { subdomain?: string | null; subdomainUrl?: string | null; customDomain?: string | null; customDomainStatus?: string | null; }

interface ChatSessionDTO { id: string; title: string | null; model: string; isProcessing?: boolean; createdAt: number; updatedAt: number; projectId?: string; projectDeployed?: boolean; shared?: boolean; }
interface ChatMessageDTO { id: string; role: string; content?: string; thinking?: string; tools?: Array<{ name: string; input?: unknown; done?: boolean }>; files?: Array<{ name: string; url: string; mimeType?: string }>; createdAt: number; authorUserId?: string; authorName?: string; }

function dtoToSession(d: ChatSessionDTO): Session {
  return { id: d.id, title: d.title || 'Sans titre', status: d.isProcessing ? 'running' : 'idle', model: d.model, updatedAt: d.updatedAt || d.createdAt || 0, projectId: d.projectId, projectDeployed: d.projectDeployed, shared: d.shared };
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
  return { id: d.id, role: d.role === 'user' ? 'user' : 'assistant', segments: hoistRefinement(segments), authorUserId: d.authorUserId, authorName: d.authorName };
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

/** Résout le libellé lisible d'un modèle depuis son id (ex. `anthropic:claude-opus-4-8`
 *  → « Opus 4.8 »). Fallback : la partie après « : » de l'id, puis l'id brut. */
function modelLabel(groups: ModelGroup[], id: string | undefined): string {
  if (!id) return '';
  for (const g of groups) {
    for (const m of g.models) if (m.id === id) return m.label;
  }
  const i = id.indexOf(':');
  return i >= 0 ? id.slice(i + 1) : id;
}

/** Traduit une erreur backend brute en message clair pour l'utilisateur. `model`
 *  est le libellé du modèle qui a tourné (injecté dans les messages de refus).
 *  Ordre = du plus spécifique au plus générique : un pattern large (50x, refus)
 *  ne doit jamais avaler un pattern précis (401, 529, contexte plein, OOM). */
function humanizeError(raw: string | undefined, e: Strings['errors'], model?: string): string {
  const s = raw ?? '';
  const m = model || 'Le modèle';
  // Échec de clone git — préfixé « clone: » côté broker, donc sans ambiguïté.
  if (/^clone:|clone failed|repository not found|could not read username|authentication failed for/i.test(s)) return e.clone;
  // Auth service (token OAuth expiré/rotaté) → bloque TOUS les users : dire que
  // retry est vain, c'est global. Avant le pattern 50x large.
  if (/401|authentication_error|invalid.{0,3}(api.?key|x-api-key)|oauth.{0,20}(expired|invalid)|invalid bearer|unauthorized/i.test(s)) return e.auth;
  // Abonnement Claude Max (OAuth) épuisé — "You've hit your (weekly) limit · resets
  // 8pm (UTC)". GLOBAL (token OAuth partagé par tous les users anthropic:*) → retry
  // inutile avant le reset. On extrait l'heure de reset pour l'afficher. Avant 429.
  if (/hit your (weekly |daily )?limit|usage limit reached|quota (has been )?exceeded/i.test(s)) {
    const reset = s.match(/resets?\b[^.·\n]*/i)?.[0]?.trim();
    return e.usageLimit.replace('{reset}', reset || e.usageLimitSoon);
  }
  // Compte/quota provider du modèle épuisé — arrive en 429 mais réessayer ne sert
  // à RIEN (contrairement à un vrai rate-limit) :
  //   • Moonshot/kimi « insufficient balance » / « exceeded_current_quota_error »
  //   • Ollama Cloud « reached your session usage limit … ollama.com/upgrade »
  //     (l'abonnement cloud partagé de TOUS les modèles cloud/* est épuisé).
  // DOIT passer AVANT le check 429 générique. On NE route PAS vers usageLimit :
  // celui-ci est Claude-spécifique et suggère « DeepSeek ou Kimi » = justement des
  // cloud/* aussi impactés. Message neutre modelDown → « choisis un autre modèle »
  // (l'user bascule vers Claude ou deepseek natif, un autre provider).
  if (/insufficient balance|exceeded_current_quota|is suspended|account (is )?suspended|reached your [^.]{0,25}usage limit|session usage limit|ollama\.com\/upgrade|add extra usage/i.test(s)) return e.modelDown;
  // 529 overloaded (capacité serveur) ≠ 429 rate-limit (quota user). 529 d'abord.
  if (/529|overloaded/i.test(s)) return e.overloaded;
  if (/429|rate.?limit/i.test(s)) return e.rate;
  if (/402|credit/i.test(s)) return e.credits;
  // Contexte plein (surtout lite/gateway sans compaction) — avant 50x/refus.
  if (/prompt is too long|context_length_exceeded|context (window )?(exceed|too long)|maximum.{0,15}context|too many tokens/i.test(s)) return e.contextFull;
  // OOM worker (cap 1536m) : « ram build: exit status 137 ». Avant 50x.
  if (/exit status 137|out of memory|\boom(-| )?kill/i.test(s)) return e.oom;
  // Provider/gateway 5xx ou upstream down (modèles cloud/*, runpod/*).
  if (/50[0234]\b|api_error|internal server|bad gateway|service unavailable|upstream|fetch failed|gateway http/i.test(s)) return e.provider;
  if (/econnreset|etimedout|econnrefused|socket hang up|\bnetwork\b|terminated/i.test(s)) return e.network;
  if (/invalid_request|does not support image|image input|400 bad request/i.test(s)) return e.invalidModel;
  // Refus de sécurité : cyber (nommé) en premier, puis refus générique.
  if (/safety measures|cybersecurity|cyber verification|cyber safeguard/i.test(s)) return e.cyber.replace('{model}', m);
  if (/stop_reason.{0,10}refusal|refusal|declined|cannot assist|can'?t help with|\bsafety\b/i.test(s)) return e.refusalGeneric.replace('{model}', m);
  // Infra Docker (spawn worker, image manquante, conflit de nom, exit 125).
  if (/spawn worker|exit status 125|name already in use|no such image|cannot connect to the docker/i.test(s)) return e.infra;
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

export function useBrokerStudio(client: BrokerClient, lang: string = 'en', brokerUrl: string = '', meId?: string) {
  const t = useMemo(() => stringsFor(lang), [lang]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [baseMessages, setBaseMessages] = useState<Message[]>([]); // persistés
  const [live, setLive] = useState<{ segments: Segment[]; thinking: string } | null>(null);
  const [streaming, setStreaming] = useState(false);
  // File d'attente de prompts (Phase 2·a) : envoyer pendant un tour n'échoue plus,
  // ça empile ; on draine le suivant à la fin du tour (effet plus bas). Client-side
  // et scopé à la session active → vidée au changement de session.
  const [queued, setQueued] = useState<string[]>([]);
  const queuedRef = useRef<string[]>([]);
  useEffect(() => { queuedRef.current = queued; }, [queued]);
  const enqueuePrompt = useCallback((text: string) => {
    const t = text.trim();
    if (t) setQueued((q) => [...q, t]);
  }, []);
  const cancelQueued = useCallback((i: number) => {
    setQueued((q) => q.filter((_, idx) => idx !== i));
  }, []);
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
  // Catalogue des modèles : source de vérité = le broker (GET /api/broker/models),
  // qui renvoie la liste filtrée (admin) + un flag `available` par modèle (calculé
  // sans appeler les modèles). Fallback local tant que le fetch n'a pas répondu.
  // Le fetch lui-même est plus bas (après la définition de `api`).
  const [modelGroups, setModelGroups] = useState<ModelGroup[]>(() => modelGroupsFor(false));
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
  // Import « démarrer depuis un repo » : repo choisi sur l'écran d'accueil AVANT
  // qu'un projet existe. Envoyé avec le 1er message (send) → le broker le lie puis
  // le clone. Effacé après le 1er envoi.
  const [pendingRepo, setPendingRepo] = useState<PendingRepo | null>(null);
  const pendingRepoRef = useRef<PendingRepo | null>(null);
  pendingRepoRef.current = pendingRepo;
  const [publishUrl, setPublishUrl] = useState<string | null>(null);
  // Slug du sous-domaine déjà publié. Un RE-publish doit le réutiliser tel quel —
  // sinon on re-dérive du titre (qui a pu changer) et on déploierait sur une
  // NOUVELLE URL en orphelinant l'ancienne. Ref pour le lire dans le callback publish.
  const [subdomain, setSubdomain] = useState<string | null>(null);
  const subdomainRef = useRef<string | null>(null);
  useEffect(() => { subdomainRef.current = subdomain; }, [subdomain]);
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
  // Refs stables pour résoudre la session d'un repo git même quand activeId a été
  // remis à null alors que le projet, lui, persiste (cas mobile/deep-link) : on
  // retrouve la session via son projectId.
  const sessionsRef = useRef(sessions);
  sessionsRef.current = sessions;
  // Pour first_prompt_submitted (send est un useCallback sans dep baseMessages).
  const baseMessagesRef = useRef(baseMessages);
  baseMessagesRef.current = baseMessages;
  const projectIdRef = useRef<string | null>(null);
  projectIdRef.current = projectId;
  // Session pour les ops git : activeId, sinon la session du projet courant.
  const resolveGitSession = (): string | null =>
    activeRef.current || sessionsRef.current.find((s) => s.projectId === projectIdRef.current)?.id || null;
  // Tour en cours: on n'accepte les frames WS (live) que pendant un tour actif.
  // Empêche les frames tardives de reconstruire le live APRÈS le chargement des
  // messages persistés → sinon doublons (live + persisté).
  const turnActive = useRef(false);
  // generation_started/_succeeded/_failed are fired SERVER-SIDE by the broker
  // (source of truth — the frontend misses turns when the tab closes mid-run,
  // and headless/API runs have no browser at all). See the broker's
  // internal/broker/analytics.go → landing /api/internal/analytics-event.
  // Deliberately NOT fired here, to avoid GA4 double-counting (GA4 custom
  // events don't dedup by id the way Meta does).

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

  // Catalogue des modèles + dispo + gating tier, servi par le broker. Une fois au mount.
  useEffect(() => {
    let stop = false;
    api.json<{ groups?: ModelGroup[]; defaultModel?: string }>('/api/broker/models').then((d) => {
      if (stop || !d?.groups || !d.groups.length) return;
      setModelGroups(d.groups);
      // Défaut renvoyé par le broker = le défaut configuré pour le TIER de l'user
      // (free→deepseek-chat, starter→kimi-k2.7-code, pro/ent→opus…). Fallback local
      // si absent.
      const def = d.defaultModel || DEFAULT_MODEL_ID;
      let saved: string | null = null;
      try { saved = localStorage.getItem('kalit.studio.model'); } catch { /* ignore */ }
      if (!saved) {
        // L'user n'a jamais choisi → démarrer sur le défaut de son tier (reflet,
        // non persisté : reste adaptatif au tier tant qu'il ne choisit pas).
        setModelState(def);
      } else {
        // Modèle sauvé verrouillé pour ce tier → retomber sur le défaut du tier,
        // sinon le broker le downgraderait en silence et le sélecteur montrerait
        // un modèle grisé « choisi ».
        const cur = d.groups.flatMap((g) => g.models).find((m) => m.id === saved);
        if (cur?.locked) setModel(def);
      }
    });
    return () => { stop = true; };
  }, [api, setModel]);

  // Preview + file-tree : poll workspace-tree de la session active (contrat §4).
  const HIDDEN = new Set(['node_modules', '.pnpm-store', '.git', '.claude', '.feed', '.playwright-mcp']);
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
    if (!projectId) { setPublishUrl(null); setSubdomain(null); setDomain({ customDomain: null, status: null, dnsRecords: null }); return; }
    let stop = false;
    api.json<{ data?: PublishInfo } & PublishInfo>(`/api/broker/project/${projectId}/publish`).then((raw) => {
      if (stop) return;
      const d = raw?.data ?? raw;
      setPublishUrl(d?.subdomainUrl ?? null);
      setSubdomain(d?.subdomain ?? null);
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
    pushDataLayer('publish_started', { target: 'subdomain' });
    setPublishing(true);
    // RE-publish : r\u00e9utiliser le sous-domaine d\u00e9j\u00e0 publi\u00e9 (URL stable). Sinon
    // (1\u00e8re publication) le d\u00e9river du titre de session.
    const slug = subdomainRef.current
      || (sessions.find((s) => s.id === activeRef.current)?.title || 'kalit')
        .toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'kalit';
    setPublishResult(null);
    const r = await client.fetch(`/api/broker/project/${projectId}/publish`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'subdomain', slug }) }).catch(() => null);
    if (r && r.ok) {
      const d = await r.json().catch(() => null);
      const payload = (d?.data ?? d);
      const url = payload?.subdomainUrl ?? null;
      setPublishUrl(url);
      setSubdomain(payload?.subdomain ?? slug);
      setPublishResult({ phase: 'ok', url });
      pushDataLayer('publish_succeeded', { target: 'subdomain' });
    }
    // 422 = backend project → publishing is front-end only for now.
    else if (r && r.status === 422) { setDeployBlocked(true); pushDataLayer('deploy_failed', { target: 'subdomain', reason: 'backend_project' }); }
    // 413 = site over Vercel's 10 MB upload limit → show the size explicitly.
    else if (r && r.status === 413) {
      const j = await r.json().catch(() => null);
      setPublishResult({ phase: 'too_large', sizeBytes: j?.sizeBytes, limitBytes: j?.limitBytes });
      pushDataLayer('deploy_failed', { target: 'subdomain', reason: 'too_large' });
    }
    else { setPublishResult({ phase: 'error' }); pushDataLayer('deploy_failed', { target: 'subdomain', reason: 'error' }); }
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
      pushDataLayer('custom_domain_connected', { domain: dom.toLowerCase() });
      return { ok: true };
    }
    return { ok: false, error: j?.error };
  }, [projectId, client]);

  const removeDomain = useCallback(async () => {
    if (!projectId) return;
    await client.fetch(`/api/broker/project/${projectId}/publish`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'remove-domain' }) }).catch(() => {});
    setDomain({ customDomain: null, status: null, dnsRecords: null });
  }, [projectId, client]);

  // ── Collaboration : invitations de projet (travailler à plusieurs) ──
  // Un invité qui ouvre le lien et l'accepte devient membre (viewer/editor) du
  // MÊME projet (workspace partagé, clé external_project_id). Créer/lister/révoquer
  // sont réservés au propriétaire côté broker ; on passe par le proxy Next signé.
  const createInvite = useCallback(async (
    opts: { role?: 'viewer' | 'editor'; email?: string; maxUses?: number; ttlHours?: number } = {},
  ): Promise<{ token: string; url: string } | null> => {
    if (!projectId) return null;
    const d = await api.json<{ data?: { token: string; url: string } }>('/api/broker/invite/create', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, role: opts.role || 'viewer', email: opts.email || undefined, maxUses: opts.maxUses, ttlHours: opts.ttlHours }),
    });
    return d?.data ?? null;
  }, [projectId, api]);

  const listInvites = useCallback(async (): Promise<ProjectInvite[]> => {
    if (!projectId) return [];
    const d = await api.json<{ data?: { invites?: ProjectInvite[] } }>(`/api/broker/invite/list?projectId=${projectId}`);
    return d?.data?.invites ?? [];
  }, [projectId, api]);

  const revokeInvite = useCallback(async (token: string): Promise<boolean> => {
    const r = await client.fetch(`/api/broker/invite/${token}/revoke`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }).catch(() => null);
    return !!(r && r.ok);
  }, [client]);

  // GitHub — lier un repo au projet (broker, session-keyed) + lister les
  // installations/repos de l'user (routes landing /api/github/*). Le token git
  // reste 100% côté broker ; ici on ne manipule que des métadonnées.
  const github = useMemo(() => ({
    status: async (): Promise<GithubLink | null> => {
      const sid = resolveGitSession(); if (!sid) return null;
      return await api.json<GithubLink>(`/api/broker/sessions/${sid}/connect-repo`);
    },
    installations: async (): Promise<{ configured: boolean; installations: GithubInstallation[] }> => {
      const d = await api.json<{ configured: boolean; installations: GithubInstallation[] }>('/api/github/installations');
      return d ?? { configured: false, installations: [] };
    },
    repos: async (installationId: string): Promise<GithubRepo[]> => {
      const d = await api.json<{ repos?: GithubRepo[] }>(`/api/github/repos?installationId=${encodeURIComponent(installationId)}`);
      return d?.repos ?? [];
    },
    connect: async (opts: { repoFullName: string; defaultBranch: string; installationId: string }): Promise<{ ok: boolean; error?: string }> => {
      const sid = resolveGitSession();
      if (!sid) return { ok: false, error: 'no active session — open a project first' };
      try {
        const r = await client.fetch(`/api/broker/sessions/${sid}/connect-repo`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ host: 'github.com', repoFullName: opts.repoFullName, defaultBranch: opts.defaultBranch, authKind: 'github_app', installationId: Number(opts.installationId), mode: 'pr' }),
        });
        if (r.ok) { pushDataLayer('integration_connected', { integration: 'repo', method: 'github_app' }); return { ok: true }; }
        let msg = 'HTTP ' + r.status;
        try { const j = await r.json(); if (j?.error) msg = j.error as string; } catch { /* no json */ }
        return { ok: false, error: msg };
      } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : 'request failed' };
      }
    },
    disconnect: async (): Promise<boolean> => {
      const sid = resolveGitSession(); if (!sid) return false;
      const r = await client.fetch(`/api/broker/sessions/${sid}/connect-repo`, { method: 'DELETE' }).catch(() => null);
      return !!(r && r.ok);
    },
    // Bouton « Push / Open PR » : déclenche la commande broker open_pr (commit +
    // push branche kalit/studio + ouvre/maj la PR). Indépendant du modèle — le
    // token reste 100% côté broker. Réponse : {ok, message, prUrl?}.
    openPr: async (opts?: { title?: string; body?: string }): Promise<{ ok: boolean; message?: string; prUrl?: string; error?: string }> => {
      const sid = resolveGitSession();
      if (!sid) return { ok: false, error: 'no active session — open a project first' };
      try {
        const r = await client.fetch(`/api/broker/sessions/${sid}/open-pr`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: opts?.title ?? '', body: opts?.body ?? '' }),
        });
        const j = await r.json().catch(() => ({}));
        if (r.ok && j?.ok) { pushDataLayer('repo_pushed', { integration: 'repo' }); return { ok: true, message: j.message, prUrl: j.prUrl }; }
        return { ok: false, error: (j?.error as string) || ('HTTP ' + r.status) };
      } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : 'request failed' };
      }
    },
    installUrl: '/api/auth/github-app/install',
  }), [api, client]);

  // Download ZIP du projet. Passe par la route Next /api/repositories/<id>/download
  // (auth NextAuth côté serveur + stream fiable) → blob → téléchargement navigateur.
  const download = useCallback(async () => {
    if (!projectId || downloading) return;
    pushDataLayer('ship_clicked', { action: 'download_code' });
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
        // COLLABORATION : prompt d'un autre participant, diffusé par le broker AVANT
        // la réponse. On l'insère dans baseMessages (donc avant l'assistant live) →
        // bon ordre. On ignore le sien (déjà affiché en optimiste) et les doublons.
        if (ev.type === 'user_message') {
          const uid = (ev as { authorUserId?: string }).authorUserId;
          if (isActive && uid && uid !== meId) {
            const mid = (ev as { id?: string }).id ?? 'um-' + String(Date.now());
            const content = (ev as { content?: string }).content ?? '';
            const an = (ev as { authorName?: string }).authorName;
            setBaseMessages((m) => m.some((x) => x.id === mid)
              ? m
              : [...m, { id: mid, role: 'user', segments: [{ kind: 'text', content }], authorUserId: uid, authorName: an }]);
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
          if (ev.type === 'error') {
            const msg = humanizeError(ev.content as string | undefined, t.errors, modelLabel(modelGroups, modelRef.current));
            setLiveError(msg);
          }
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
    // Rétention : ré-ouverture d'un projet existant depuis la sidebar.
    pushDataLayer('project_reopened', { session: id });
    setQueued([]); // la file d'attente est scopée à la session active
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
    pushDataLayer('project_created', { session: sid, model: modelRef.current });
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
    // Funnel (activation) : compté AVANT d'ajouter le message optimiste.
    const isFirstPrompt = baseMessagesRef.current.filter((m) => m.role === 'user').length === 0;
    const sid = await ensureSession();
    if (!sid) return;
    pushDataLayer(isFirstPrompt ? 'first_prompt_submitted' : 'prompt_submitted', { session: sid, model: modelRef.current });
    // generation_started is fired server-side by the broker (see comment above).
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
      // Import « démarrer depuis un repo » : on joint le repo choisi sur l'écran
      // d'accueil au 1er message → le broker le lie AVANT le tour (donc avant le
      // clone). On l'efface tout de suite : il ne s'applique qu'à ce 1er envoi.
      const pr = pendingRepoRef.current;
      if (pr) setPendingRepo(null);
      const connectRepo = pr ? { host: 'github.com', repoFullName: pr.repoFullName, defaultBranch: pr.defaultBranch, authKind: 'github_app', installationId: Number(pr.installationId), mode: 'pr' } : undefined;
      const r = await client.fetch(`/api/broker/sessions/${sid}/messages`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: body, language: lang, progressMode: 'default', suite: 'project', model: modelRef.current, precision: precisionRef.current, taskforceModelProvider: DEFAULT_TF_PROVIDER, requestId: 'r' + Date.now(), connectRepo }) });
      if (r.status === 402) {
        pushDataLayer('credits_exhausted', { surface: 'studio' });
        pushDataLayer('paywall_viewed', { surface: 'studio', mode: 'out_of_credits' });
        setOutOfCredits(true); finalizeSoft(); setBaseMessages((m) => m.filter((x) => !x.id.startsWith('temp-'))); return;
      }
      // 403 storage_limit : le broker refuse une NOUVELLE création (quota plein).
      if (r.status === 403) {
        const d = await r.json().catch(() => null);
        if (d?.error === 'storage_limit') {
          pushDataLayer('paywall_viewed', { surface: 'studio', mode: 'storage_limit' });
          setStorageBlocked(true); finalizeSoft(); setBaseMessages((m) => m.filter((x) => !x.id.startsWith('temp-'))); return;
        }
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
            if (ev.type === 'error') { pushError(sid, humanizeError(ev.content, t.errors, modelLabel(modelGroups, modelRef.current))); }
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

  // Drain la file d'attente : quand le tour se termine (streaming → false) et qu'il
  // reste des prompts empilés, on envoie le suivant. sendRef évite un cycle de deps
  // (send dépend de beaucoup d'états). Petit délai pour laisser la finalisation poser.
  const sendRef = useRef(send);
  useEffect(() => { sendRef.current = send; }, [send]);
  useEffect(() => {
    if (streaming || queuedRef.current.length === 0) return;
    const next = queuedRef.current[0];
    setQueued((q) => q.slice(1));
    const id = setTimeout(() => sendRef.current(next), 250);
    return () => clearTimeout(id);
  }, [streaming]);

  const stop = useCallback(async () => {
    if (activeId) await client.fetch(`/api/broker/cancel/${activeId}`, { method: 'POST' }).catch(() => {});
    setStreaming(false); setActivity(null);
  }, [activeId, client]);

  // IMPORTANT : on efface AUSSI projectId ici. Sinon un « New project » garde le
  // projectId stale du projet précédent → canPublish/le menu « Connecter GitHub »
  // restent actifs et le fallback resolveGitSession lie le repo à l'ANCIEN projet.
  // Sur un projet neuf il n'y a pas encore de projet/session : la connexion git
  // n'apparaît qu'après le 1er prompt (quand le projet existe vraiment).
  const newProject = useCallback(() => { setActiveId(null); setProjectId(null); setTree([]); setPreviewUrl(null); setBaseMessages([]); setLive(null); setStreaming(false); setActivity(null); setPending([]); setQueued([]); setOutOfCredits(false); setCtxPercent(null); }, []);

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

  // Renomme une session (menu « ⋯ » de la sidebar). PATCH le titre côté broker
  // puis met à jour l'état local optimistiquement. Retourne false sur échec.
  const renameSession = useCallback(async (id: string, title: string): Promise<boolean> => {
    const t = title.trim();
    if (!id || !t) return false;
    setSessions((list) => list.map((s) => (s.id === id ? { ...s, title: t } : s)));
    const r = await client.fetch(`/api/broker/sessions/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: t }),
    }).catch(() => null);
    if (!r || !r.ok) { loadSessions(); return false; } // resync si l'écriture a échoué
    return true;
  }, [client, loadSessions]);

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

  // Feed d'activité live pour l'aperçu : dérivé des segments tool déjà reçus
  // (Write/Bash/browser/find-assets…) + la taille des fichiers depuis l'arbre.
  // fileWrite = le tour a-t-il écrit un fichier (déclencheur build vs conversation).
  const previewActivity = useMemo(() => {
    const sizes = flattenSizes(tree as unknown as { path: string; size?: number; children?: unknown[] }[]);
    const byName = new Map<string, number>();
    for (const [p, sz] of sizes) byName.set(p.split('/').pop() || p, sz);
    const sizeOf = (fp: string) => sizes.get(fp) ?? byName.get(fp.split('/').pop() || fp);
    const segs = (streaming && live ? live.segments : []) as Segment[];
    return {
      steps: deriveActivity(segs, sizeOf, !!(live && live.thinking) && streaming),
      fileWrite: hasFileActivity(segs),
    };
  }, [live, tree, streaming]);

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

  return { sessions, activeId, messages, streaming, activity, ctxPercent, tree, previewUrl, model, publishUrl, publishing, publishResult, clearPublishResult: () => setPublishResult(null), deployBlocked, dismissDeployBlocked: () => setDeployBlocked(false), storage, storageBlocked, dismissStorageBlocked: () => setStorageBlocked(false), domain, connectDomain, removeDomain, canPublish: !!projectId, canDownload: !!projectId, downloading, attachments, uploading, outOfCredits, addFiles, removeAttachment, checkPromptQuality, socketStatus: socket.status, queued, enqueuePrompt, cancelQueued, select, newProject, send, stop, deleteSession, setModel, modelGroups, previewActivity, precision, setPrecision, publish, download, refreshTree, reloadSessions: loadSessions, shareSession, canShare: !!activeId && messages.length > 0, canShareProject: !!projectId, createInvite, listInvites, revokeInvite, github, pendingRepo, setPendingRepo, renameSession };
}
