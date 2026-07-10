import { StrictMode, useCallback, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { StudioShell } from '../src';
import type { Activity, FileNode, Message, Session } from '../src/lib/types';
import { createDevClient } from '../src/broker/client';
import { useBrokerStudio } from '../src/broker/useBrokerStudio';

// Mode live (?live) : branche le vrai broker via l'adaptateur. Le token de dev
// est pré-minté (dev-token.ts, gitignoré). En prod c'est getToken → NextAuth.
const LIVE = new URLSearchParams(location.search).has('live');

function LiveApp() {
  const [client] = useState(() => createDevClient({
    getToken: async () => (await import('./dev-token')).DEV_TOKEN,
    baseUrl: '', wsBaseUrl: '', // same-origin → proxifié par Vite vers le broker
  }));
  const s = useBrokerStudio(client);
  return (
    <StudioShell
      sessions={s.sessions} activeId={s.activeId} messages={s.messages}
      streaming={s.streaming} activity={s.activity} ctxPercent={null}
      previewUrl={s.previewUrl} tree={s.tree}
      user={{ name: 'Studio v2 Dev' }}
      model={s.model} onModelChange={s.setModel}
      publishUrl={s.publishUrl} publishing={s.publishing} canPublish={s.canPublish} onPublish={s.publish}
      onSelect={s.select} onNew={s.newProject} onSend={s.send} onStop={s.stop}
      onRefreshTree={s.refreshTree}
    />
  );
}

// Harnais de dev : données mockées + simulation de streaming (thinking → tool →
// texte) pour valider l'UX sans le broker. Remplacé par l'adaptateur broker réel
// au branchement.

const SESSIONS: Session[] = [
  { id: 'a1', title: 'Landing page — studio de café Meridian', status: 'idle', model: 'claude-sonnet-5', updatedAt: Date.now() - 6e4 },
  { id: 'a2', title: 'Dashboard analytics SaaS', status: 'running', model: 'claude-opus-4-8', updatedAt: Date.now() - 2e5 },
  { id: 'a3', title: 'Fan-site Naruto immersif', status: 'idle', model: 'cloud/kimi-k2.5:cloud', updatedAt: Date.now() - 9e5 },
  { id: 'a4', title: 'App kanban gestion de projet', status: 'archived', updatedAt: Date.now() - 5e6 },
];

const TREE: FileNode[] = [
  { name: 'index.html', path: 'index.html', dir: false, size: 8420 },
  { name: 'styles.css', path: 'styles.css', dir: false, size: 12300 },
  { name: 'script.js', path: 'script.js', dir: false, size: 3100 },
  { name: 'assets', path: 'assets', dir: true, children: [
    { name: 'logo.svg', path: 'assets/logo.svg', dir: false, size: 610 },
    { name: 'hero.jpg', path: 'assets/hero.jpg', dir: false, size: 184000 },
  ] },
  { name: 'node_modules', path: 'node_modules', dir: true, collapsed: true },
];

const INITIAL: Message[] = [
  { id: 'm1', role: 'user', segments: [{ kind: 'text', content: 'Refais la landing de Meridian Coffee, éditorial et haut de gamme.' }] },
  { id: 'm2', role: 'assistant', segments: [
    { kind: 'thinking', content: 'Je consulte les références café de spécialité, je pose la structure éditoriale puis j\'extrais les vrais visuels.' },
    { kind: 'tool', name: 'Write', input: 'index.html', done: true },
    { kind: 'tool', name: 'mcp__find-assets', input: 'grains de café macro, terracotta', done: true },
    { kind: 'text', content: 'Structure éditoriale posée : hero, origine mise en avant, traçabilité par lot, carnet, footer riche. J\'intègre les vrais visuels puis je vérifie le rendu au navigateur.' },
  ] },
];

function App() {
  const [activeId, setActiveId] = useState<string | null>('a1');
  const [messages, setMessages] = useState<Message[]>(INITIAL);
  const [streaming, setStreaming] = useState(false);
  const [activity, setActivity] = useState<Activity | null>(null);
  const [ctx, setCtx] = useState<number | null>(27);
  const [model, setModel] = useState('kimi-k2.5:cloud');
  const timers = useRef<number[]>([]);

  const stop = useCallback(() => { timers.current.forEach(clearTimeout); timers.current = []; setStreaming(false); setActivity(null); }, []);

  const send = useCallback((text: string) => {
    setMessages((m) => [...m, { id: 'u' + Date.now(), role: 'user', segments: [{ kind: 'text', content: text }] }]);
    const id = 'a' + Date.now();
    setMessages((m) => [...m, { id, role: 'assistant', segments: [] }]);
    setStreaming(true);
    const push = (seg: Message['segments'][number]) => setMessages((m) => m.map((x) => x.id === id ? { ...x, segments: [...x.segments, seg] } : x));
    const script: Array<[number, () => void]> = [
      [200, () => setActivity({ label: 'réfléchit', since: Date.now() })],
      [900, () => { push({ kind: 'thinking', content: 'J\'analyse la demande et je prépare le squelette.' }); }],
      [1900, () => { setActivity({ label: 'écrit un fichier', since: Date.now() }); push({ kind: 'tool', name: 'Write', input: 'index.html', done: true }); }],
      [3100, () => { setActivity({ label: 'pilote le navigateur', since: Date.now() }); push({ kind: 'tool', name: 'mcp__browser_navigate', input: '$PREVIEW_URL', done: true }); }],
      [4200, () => { setActivity({ label: 'rédige la réponse', since: Date.now() }); push({ kind: 'text', content: 'Première version en place, visible dans l\'aperçu. Je peaufine le design et les vrais assets.' }); setCtx((c) => (c ?? 0) + 6); }],
      [5200, () => { stop(); }],
    ];
    timers.current = script.map(([d, fn]) => window.setTimeout(fn, d));
  }, [stop]);

  return (
    <StudioShell
      sessions={SESSIONS} activeId={activeId} messages={messages}
      streaming={streaming} activity={activity} ctxPercent={ctx}
      previewUrl="https://example.com" tree={TREE}
      user={{ name: 'Vincent', credits: 1240 }}
      model={model} onModelChange={setModel}
      onSelect={setActiveId}
      onNew={() => { setActiveId(null); setMessages([]); }}
      onSend={send} onStop={stop} onRefreshTree={() => {}}
    />
  );
}

createRoot(document.getElementById('sv-root')!).render(<StrictMode>{LIVE ? <LiveApp /> : <App />}</StrictMode>);
