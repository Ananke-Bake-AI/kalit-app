import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import type { Activity, FileNode, Message, PreviewMode, Session } from './lib/types';
import type { DomainState, PublishResult, ProjectInvite, GithubApi, PendingRepo } from './broker/useBrokerStudio';
import { Sidebar } from './components/Sidebar';
import { Chat } from './components/Chat';
import { Preview } from './components/Preview';
import { IconFolder, IconEye } from './lib/icons';
import { StringsContext, stringsFor } from './lib/i18n';
import { pushDataLayer } from './lib/analytics';
import './styles/theme.css';
import './components/shell.css';

type MobilePane = 'sessions' | 'chat' | 'preview';

// Séparateur chat|preview redimensionnable (PC uniquement). Largeur du chat
// sauvée en localStorage. Sidebar = 248px fixe ; on garde un min visible des
// deux côtés. En dessous de 860px (mobile mono-panneau) le resizer est masqué.
const SPLIT_KEY = 'kalit.studio.split';
const SIDEBAR_W = 248;
const RESIZER_W = 0; // colonne 0px : la poignée est un overlay, elle ne prend pas de place
const CHAT_MIN = 380;
const PREVIEW_MIN = 420;
const ChatIcon = (p: { width?: number; height?: number }) => (
  <svg width={p.width ?? 19} height={p.height ?? 19} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H8l-4 4V5a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2Z" /></svg>
);

export interface StudioShellProps {
  sessions: Session[];
  activeId: string | null;
  messages: Message[];
  streaming: boolean;
  activity: Activity | null;
  previewUrl: string | null;
  tree: FileNode[];
  publishUrl?: string | null;
  publishing?: boolean;
  canPublish?: boolean;
  onPublish?: () => void;
  canDownload?: boolean;
  downloading?: boolean;
  onDownload?: () => void;
  user: { name: string; credits?: number };
  meId?: string; // id de l'utilisateur courant (attribution des messages partagés)
  ctxPercent?: number | null;
  model: string;
  modelGroups?: import('./lib/models').ModelGroup[];
  lang?: string;
  onModelChange: (id: string) => void;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string, mode: 'session' | 'project') => void;
  onRename?: (id: string, title: string) => Promise<boolean> | void;
  onSend: (text: string) => void;
  onStop: () => void;
  queued?: string[];
  onQueuePrompt?: (text: string) => void;
  onCancelQueued?: (i: number) => void;
  onRefreshTree: () => void;
  attachments?: { id: string; name: string }[];
  uploading?: boolean;
  onAddFiles?: (files: File[]) => void;
  onRemoveAttachment?: (id: string) => void;
  outOfCredits?: boolean;
  deployBlocked?: boolean;
  onDismissDeployBlocked?: () => void;
  storage?: { usedBytes: number; limitBytes: number } | null;
  tokenUsage?: { used: number; total: number } | null;
  storageBlocked?: boolean;
  onDismissStorageBlocked?: () => void;
  domain?: DomainState;
  onConnectDomain?: (domain: string) => Promise<{ ok: boolean; error?: string }>;
  onRemoveDomain?: () => void;
  publishResult?: PublishResult | null;
  onClearPublishResult?: () => void;
  previewActivity?: { steps: import('./lib/activity').ActivityStep[]; fileWrite: boolean };
  checkPromptQuality?: (text: string) => Promise<'none' | 'enrich' | 'rich' | null>;
  isAdmin?: boolean;
  precision?: boolean;
  onPrecisionChange?: (on: boolean) => void;
  onShare?: (action: 'share' | 'unshare') => Promise<{ shared: boolean; shareId?: string } | null>;
  canShare?: boolean;
  canShareProject?: boolean;
  onCreateInvite?: (opts: { role: 'viewer' | 'editor'; email?: string }) => Promise<{ token: string; url: string } | null>;
  onListInvites?: () => Promise<ProjectInvite[]>;
  onRevokeInvite?: (token: string) => Promise<boolean>;
  github?: GithubApi;
  pendingRepo?: PendingRepo | null;
  setPendingRepo?: (r: PendingRepo | null) => void;
}

/** Shell présentation pur : reçoit l'état et les callbacks, ne connaît pas le
 *  transport. L'adaptateur broker (à venir) fournit ces props depuis le
 *  broker-client + le hook socket, en respectant le contrat WS/REST. */
export function StudioShell(props: StudioShellProps) {
  const [mode, setMode] = useState<PreviewMode>('preview');
  const [pane, setPane] = useState<MobilePane>('chat');
  const active = props.sessions.find((s) => s.id === props.activeId);
  const t = stringsFor(props.lang);

  // en mobile, sélectionner une session bascule automatiquement sur le chat
  const selectMobile = (id: string) => { props.onSelect(id); setPane('chat'); };
  const sendSuggest = (text: string) => { props.onSend(text); setPane('chat'); };

  // Clavier virtuel mobile (iOS surtout). `100dvh` NE rétrécit PAS à l'ouverture du
  // clavier (WebKit n'implémente pas `interactive-widget`), et iOS scrolle le <body>
  // pour révéler le champ SANS toujours le remettre à 0 à la fermeture → vide béant.
  // Fix robuste (recherche + 3 agents) :
  //  1) lock du <body> (position:fixed via .sv-studio-lock, CSS mobile) → le body ne
  //     scrolle plus, donc aucun offset résiduel à restaurer ;
  //  2) shell piloté sur le visualViewport : hauteur (--sv-vh) ET position verticale
  //     (--sv-voff = offsetTop) → il colle à la zone réellement visible ;
  //  3) ré-application différée (rAF + timeout) et au focusout : sur iOS le resize de
  //     FERMETURE arrive avec une valeur encore réduite (stale) → on relit après.
  useEffect(() => {
    const vv = typeof window !== 'undefined' ? window.visualViewport : null;
    const root = document.documentElement;
    const apply = () => {
      if (!vv) return;
      root.style.setProperty('--sv-vh', Math.round(vv.height) + 'px');
      root.style.setProperty('--sv-voff', Math.round(vv.offsetTop) + 'px');
      // Clavier ouvert ≈ le visualViewport perd >120px vs l'écran. On pose une
      // classe pour masquer la barre de nav du bas (qui sinon chevauche le prompt
      // quand on tape) — la nav ne sert pas pendant la saisie.
      document.body.classList.toggle('sv-kbd', (window.innerHeight - vv.height) > 120);
    };
    const applySoon = () => { apply(); requestAnimationFrame(apply); setTimeout(apply, 250); };
    applySoon();
    document.body.classList.add('sv-studio-lock');
    vv?.addEventListener('resize', apply);
    vv?.addEventListener('scroll', apply);
    window.addEventListener('focusout', applySoon);
    window.addEventListener('orientationchange', applySoon);
    return () => {
      vv?.removeEventListener('resize', apply);
      vv?.removeEventListener('scroll', apply);
      window.removeEventListener('focusout', applySoon);
      window.removeEventListener('orientationchange', applySoon);
      document.body.classList.remove('sv-studio-lock');
      document.body.classList.remove('sv-kbd');
      root.style.removeProperty('--sv-vh');
      root.style.removeProperty('--sv-voff');
    };
  }, []);

  // ── Redimensionnement du split chat|preview (PC) ──
  const shellRef = useRef<HTMLDivElement>(null);
  const [splitPx, setSplitPx] = useState<number | null>(null);
  const dragging = useRef(false);
  useEffect(() => {
    try { const s = localStorage.getItem(SPLIT_KEY); if (s) { const n = parseInt(s, 10); if (Number.isFinite(n)) setSplitPx(n); } } catch { /* ignore */ }
  }, []);
  const clampSplit = (x: number): number => {
    const el = shellRef.current;
    const total = el ? el.getBoundingClientRect().width : window.innerWidth;
    const max = total - SIDEBAR_W - RESIZER_W - PREVIEW_MIN;
    return Math.max(CHAT_MIN, Math.min(x, Math.max(CHAT_MIN, max)));
  };
  const widthFromEvent = (clientX: number): number => {
    const el = shellRef.current; if (!el) return CHAT_MIN;
    return clampSplit(clientX - el.getBoundingClientRect().left - SIDEBAR_W);
  };
  const onResizeDown = (e: ReactPointerEvent) => {
    if (window.innerWidth <= 860) return; // mono-panneau mobile : pas de resize
    dragging.current = true;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    e.preventDefault();
  };
  const onResizeMove = (e: ReactPointerEvent) => {
    if (!dragging.current) return;
    // MAJ directe du DOM pendant le drag (fluide, sans re-render) ; commit au relâchement.
    shellRef.current?.style.setProperty('--sv-chat-w', widthFromEvent(e.clientX) + 'px');
  };
  const commitResize = (e: ReactPointerEvent) => {
    if (!dragging.current) return;
    dragging.current = false;
    (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    const w = widthFromEvent(e.clientX);
    setSplitPx(w);
    try { localStorage.setItem(SPLIT_KEY, String(w)); } catch { /* ignore */ }
  };
  const resetResize = () => {
    setSplitPx(null);
    shellRef.current?.style.removeProperty('--sv-chat-w');
    try { localStorage.removeItem(SPLIT_KEY); } catch { /* ignore */ }
  };
  const onResizeKey = (e: ReactKeyboardEvent) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const el = shellRef.current;
    const cur = splitPx ?? (el ? el.getBoundingClientRect().width - SIDEBAR_W - RESIZER_W - PREVIEW_MIN : CHAT_MIN);
    const w = clampSplit(cur + (e.key === 'ArrowRight' ? 24 : -24));
    setSplitPx(w);
    try { localStorage.setItem(SPLIT_KEY, String(w)); } catch { /* ignore */ }
  };
  const resizeHint = props.lang?.startsWith('fr')
    ? 'Glisser pour redimensionner · double-clic pour réinitialiser'
    : 'Drag to resize · double-click to reset';

  return (
    <StringsContext.Provider value={t}>
    <div
      className="sv sv-shell"
      data-pane={pane}
      ref={shellRef}
      style={splitPx != null ? ({ '--sv-chat-w': splitPx + 'px' } as CSSProperties) : undefined}
    >
      <Sidebar sessions={props.sessions} activeId={props.activeId} user={props.user} storage={props.storage ?? null} tokenUsage={props.tokenUsage ?? null} onSelect={selectMobile} onNew={() => { props.onNew(); setPane('chat'); }} onDelete={props.onDelete} onRename={props.onRename} />
      <Chat
        title={active?.title ?? t.newProject}
        messages={props.messages} streaming={props.streaming} activity={props.activity}
        ctxPercent={props.ctxPercent} model={props.model} modelGroups={props.modelGroups} onModelChange={props.onModelChange}
        onSend={props.onSend} onStop={props.onStop} onChoiceAnswer={props.onSend}
        queued={props.queued} onQueuePrompt={props.onQueuePrompt} onCancelQueued={props.onCancelQueued}
        meId={props.meId}
        attachments={props.attachments} uploading={props.uploading}
        onAddFiles={props.onAddFiles} onRemoveAttachment={props.onRemoveAttachment}
        outOfCredits={props.outOfCredits} pricingHref={`/${props.lang || 'en'}/pricing`}
        checkPromptQuality={props.checkPromptQuality} isAdmin={props.isAdmin}
        precision={props.precision} onPrecisionChange={props.onPrecisionChange}
        onShare={props.onShare} canShare={props.canShare}
      />
      <div
        className="sv-resizer"
        role="separator"
        aria-orientation="vertical"
        aria-label={resizeHint}
        tabIndex={0}
        title={resizeHint}
        onPointerDown={onResizeDown}
        onPointerMove={onResizeMove}
        onPointerUp={commitResize}
        onPointerCancel={commitResize}
        onDoubleClick={resetResize}
        onKeyDown={onResizeKey}
      />
      <Preview
        mode={mode} onMode={setMode} previewUrl={props.previewUrl} tree={props.tree}
        publishUrl={props.publishUrl ?? null} publishing={!!props.publishing} canPublish={!!props.canPublish} onPublish={props.onPublish ?? (() => {})}
        canDownload={!!props.canDownload} downloading={!!props.downloading} onDownload={props.onDownload ?? (() => {})}
        onRefresh={props.onRefreshTree} onOpen={() => props.previewUrl && window.open(props.previewUrl, '_blank')}
        building={props.streaming} hasMessages={props.messages.length > 0} onSuggest={sendSuggest}
        activitySteps={props.previewActivity?.steps} fileWrite={props.previewActivity?.fileWrite}
        onFocusChat={() => setPane('chat')}
        domain={props.domain} onConnectDomain={props.onConnectDomain} onRemoveDomain={props.onRemoveDomain}
        publishResult={props.publishResult} onClearPublishResult={props.onClearPublishResult}
        canShareProject={props.canShareProject} onCreateInvite={props.onCreateInvite} onListInvites={props.onListInvites} onRevokeInvite={props.onRevokeInvite} github={props.github} pendingRepo={props.pendingRepo} onSetPendingRepo={props.setPendingRepo}
      />
      <nav className="sv-mnav" aria-label={t.navigation}>
        <button aria-selected={pane === 'sessions'} onClick={() => setPane('sessions')}><IconFolder /> {t.navProjects}</button>
        <button aria-selected={pane === 'chat'} onClick={() => setPane('chat')}><ChatIcon /> {t.navChat}</button>
        <button aria-selected={pane === 'preview'} onClick={() => setPane('preview')}><IconEye /> {t.navPreview}</button>
      </nav>
      {props.deployBlocked && (
        <div className="sv-modal" onClick={() => props.onDismissDeployBlocked?.()}>
          <div className="sv-modal__panel" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <h3 className="sv-modal__title">{t.deployBlocked.title}</h3>
            <p className="sv-modal__sub">{t.deployBlocked.body}</p>
            <div className="sv-modal__row">
              <button className="sv-btn sv-btn--primary" onClick={() => props.onDismissDeployBlocked?.()}>{t.deployBlocked.close}</button>
            </div>
          </div>
        </div>
      )}
      {props.storageBlocked && (
        <div className="sv-modal" onClick={() => props.onDismissStorageBlocked?.()}>
          <div className="sv-modal__panel" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <h3 className="sv-modal__title">{t.storage.blockedTitle}</h3>
            <p className="sv-modal__sub">{t.storage.blockedBody}</p>
            <div className="sv-modal__row">
              <a className="sv-btn sv-btn--primary" href={`/${props.lang || 'en'}/pricing`} target="_blank" rel="noreferrer" onClick={() => pushDataLayer('upgrade_clicked', { surface: 'studio', mode: 'storage_limit' })}>{t.upgrade}</a>
              <button className="sv-btn sv-btn--ghost" onClick={() => props.onDismissStorageBlocked?.()}>{t.storage.close}</button>
            </div>
          </div>
        </div>
      )}
    </div>
    </StringsContext.Provider>
  );
}
