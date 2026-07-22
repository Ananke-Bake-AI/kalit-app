import { useRef, useState } from 'react';
import type { FileNode, PreviewMode } from '../lib/types';
import { pushDataLayer } from '../lib/analytics';
import { IconCode, IconExpand, IconEye, IconFolder, IconFile, IconRefresh, IconLogo, IconDownload, IconUsers, IconGlobe, IconDots, IconGit } from '../lib/icons';
import { useStrings } from '../lib/i18n';
import { DomainManager } from './DomainManager';
import { ShareDialog } from './ShareDialog';
import { GitHubConnect } from './GitHubConnect';
import { Menu, type MenuItem } from './Menu';
import { PublishModal } from './PublishModal';
import { BuildingView, NoSiteView, ActivityStrip } from './PreviewLive';
import type { ActivityStep } from '../lib/activity';
import type { DomainState, PublishResult, ProjectInvite, GithubApi, PendingRepo } from '../broker/useBrokerStudio';

// Un site servable existe-t-il dans le workspace ? previewUrl est non-null dès que
// le projet existe (même 0 fichier) → mauvais signal. La vérité = l'arbre contient
// un fichier HTML (ou assez de fichiers). Sinon on montre l'état build/vide.
function treeHasSite(nodes: FileNode[]): boolean {
  let count = 0;
  const walk = (ns: FileNode[]): boolean => {
    for (const n of ns) {
      if (n.dir) {
        if (n.name === '.feed' || n.name === '.playwright-mcp') continue; // artefacts de suivi, pas le site
        if (n.children && walk(n.children)) return true;
        continue;
      }
      if (/\.html?$/i.test(n.name)) return true;
      if (!/^\./.test(n.name)) count++;
    }
    return false;
  };
  return walk(nodes) || count >= 4;
}

// Icônes décoratives par suggestion (même ordre que t.suggestions, fr/en alignés).
const SUG_ICONS = [
  // restaurant
  <path key="i" d="M4 3v6a2 2 0 0 0 2 2h0v10M6 3v6M9 3v6M9 3v18M17 3c-1.2 0-2 1.6-2 4s.8 3.5 2 3.5V21" />,
  // portfolio / photo
  <><rect key="a" x="3" y="6" width="18" height="14" rx="2.5" /><circle key="b" cx="12" cy="13" r="3.4" /><path key="c" d="M8 6l1.5-2h5L16 6" /></>,
  // dashboard SaaS
  <><rect key="a" x="3" y="3" width="7" height="9" rx="1.6" /><rect key="b" x="14" y="3" width="7" height="5" rx="1.6" /><rect key="c" x="14" y="12" width="7" height="9" rx="1.6" /><rect key="d" x="3" y="16" width="7" height="5" rx="1.6" /></>,
  // app mobile
  <><rect key="a" x="6" y="2.5" width="12" height="19" rx="3" /><path key="b" d="M10.5 18.5h3" /></>,
  // cabinet d'avocats (colonnes)
  <path key="i" d="M4 9h16M5 9l7-5 7 5M6.5 9v8M11 9v8M13 9v8M17.5 9v8M4 21h16" />,
  // audit sécurité (pentest) : bouclier + check
  <><path key="a" d="M12 2.5l7.5 3v5.7c0 4.5-3.1 7.6-7.5 9-4.4-1.4-7.5-4.5-7.5-9V5.5l7.5-3z" /><path key="b" d="M8.8 12.2l2.3 2.3 4.1-4.4" /></>,
];

const IconArrow = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
);

interface Props {
  mode: PreviewMode;
  onMode: (m: PreviewMode) => void;
  previewUrl: string | null;
  tree: FileNode[];
  publishUrl: string | null;
  publishing: boolean;
  canPublish: boolean;
  onPublish: () => void;
  canDownload: boolean;
  downloading: boolean;
  onDownload: () => void;
  onRefresh: () => void;
  onOpen: () => void;
  building?: boolean;
  hasMessages?: boolean;
  onSuggest?: (prompt: string) => void;
  domain?: DomainState;
  onConnectDomain?: (domain: string) => Promise<{ ok: boolean; error?: string }>;
  onRemoveDomain?: () => void;
  publishResult?: PublishResult | null;
  onClearPublishResult?: () => void;
  canShareProject?: boolean;
  onCreateInvite?: (opts: { role: 'viewer' | 'editor'; email?: string }) => Promise<{ token: string; url: string } | null>;
  onListInvites?: () => Promise<ProjectInvite[]>;
  onRevokeInvite?: (token: string) => Promise<boolean>;
  github?: GithubApi;               // connecter un repo GitHub au projet
  pendingRepo?: PendingRepo | null; // repo choisi sur l'accueil (import), cloné au 1er prompt
  onSetPendingRepo?: (r: PendingRepo | null) => void;
  activitySteps?: ActivityStep[];   // feed live « ce que fait l'agent »
  fileWrite?: boolean;              // le tour en cours écrit-il des fichiers ?
  onFocusChat?: () => void;         // CTA « Décrire mon site » → focus le chat
}

function fmt(b?: number) {
  if (!b) return '';
  if (b > 1e6) return (b / 1e6).toFixed(1) + ' Mo';
  if (b > 1e3) return Math.round(b / 1e3) + ' Ko';
  return b + ' o';
}

function Tree({ nodes, depth = 0 }: { nodes: FileNode[]; depth?: number }) {
  return (
    <>
      {nodes.map((n) => (
        <div key={n.path}>
          <div className="sv-tree__row" style={{ paddingLeft: 4 + depth * 14 }}>
            {n.dir ? <IconFolder className="sv-tree__dir" width={14} height={14} /> : <IconFile className="sv-tree__file" width={14} height={14} />}
            <span className={n.dir ? 'sv-tree__dir' : 'sv-tree__file'}>{n.name}{n.dir ? '/' : ''}{n.collapsed ? ' …' : ''}</span>
            {!n.dir && <span className="sv-tree__sz">{fmt(n.size)}</span>}
          </div>
          {n.children && !n.collapsed && <Tree nodes={n.children} depth={depth + 1} />}
        </div>
      ))}
    </>
  );
}

/** État du panneau quand il n'y a pas encore d'aperçu à montrer. */
function PreviewEmpty({ building, hasMessages, onSuggest, github, pendingRepo, onSetPendingRepo }: { building?: boolean; hasMessages?: boolean; onSuggest?: (p: string) => void; github?: GithubApi; pendingRepo?: PendingRepo | null; onSetPendingRepo?: (r: PendingRepo | null) => void }) {
  const t = useStrings();
  const [pickOpen, setPickOpen] = useState(false);

  // L'agent travaille (ou a commencé) mais aucun fichier servable encore.
  if (building || hasMessages) {
    return (
      <div className="sv-prev__state">
        <div className="sv-prev__spinner" aria-hidden />
        <div className="sv-prev__state-title">{t.building}</div>
        <div className="sv-prev__state-sub">{t.buildingSub}</div>
      </div>
    );
  }

  // Nouvelle session : propositions de départ (sans encombrer le chat).
  return (
    <div className="sv-welcome">
      <div className="sv-welcome__glow" aria-hidden />
      <div className="sv-welcome__inner">
        <div className="sv-welcome__hero">
          <span className="sv-welcome__mark"><IconLogo width={30} height={30} /></span>
          <h1 className="sv-welcome__title">{t.suggestTitle}</h1>
          <p className="sv-welcome__sub">{t.suggestSub}</p>
        </div>
        <div className="sv-welcome__grid">
          {t.suggestions.map((s, i) => (
            <button key={s} type="button" className="sv-card" onClick={() => onSuggest?.(s)}>
              <span className="sv-card__ic">
                <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  {SUG_ICONS[i % SUG_ICONS.length]}
                </svg>
              </span>
              <span className="sv-card__txt">{s}</span>
              <span className="sv-card__arr"><IconArrow /></span>
            </button>
          ))}
        </div>
        {/* Démarrer depuis un repo GitHub : on choisit ici, le repo sera cloné au
            1er prompt (le projet n'existe pas encore). */}
        {github && onSetPendingRepo && (
          <div className="sv-welcome__import">
            {pendingRepo ? (
              <div className="sv-gh__repo-row">
                <span className="sv-gh__dot" />
                <div className="sv-gh__repo-main">
                  <span className="sv-gh__repo-name">{pendingRepo.repoFullName}</span>
                  <span className="sv-gh__repo-hint">{t.github.willImport}</span>
                </div>
                <button className="sv-btn sv-btn--ghost sv-btn--sm" onClick={() => onSetPendingRepo(null)}>{t.github.remove}</button>
              </div>
            ) : (
              <button type="button" className="sv-btn sv-btn--ghost sv-welcome__importbtn" onClick={() => setPickOpen(true)}>
                <IconGit width={16} height={16} /> {t.github.importCta}
              </button>
            )}
          </div>
        )}
      </div>
      {pickOpen && github && (
        <GitHubConnect github={github} onPick={(r) => onSetPendingRepo?.(r)} onClose={() => setPickOpen(false)} />
      )}
    </div>
  );
}

export function Preview({ mode, onMode, previewUrl, tree, publishUrl, publishing, canPublish, onPublish, canDownload, downloading, onDownload, onRefresh, onOpen, building, hasMessages, onSuggest, domain, onConnectDomain, onRemoveDomain, publishResult, onClearPublishResult, canShareProject, onCreateInvite, onListInvites, onRevokeInvite, github, pendingRepo, onSetPendingRepo, activitySteps = [], fileWrite = false, onFocusChat }: Props) {
  const t = useStrings();
  const [domainOpen, setDomainOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  // app_preview_rendered : une fois par projet (previewUrl), pas à chaque reload
  // de l'iframe (le poll du tree + les re-render la remontent souvent).
  const previewTrackedRef = useRef<string | null>(null);
  const [githubOpen, setGithubOpen] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const canShare = !!canShareProject && !!onCreateInvite && !!onListInvites && !!onRevokeInvite;
  const hasDomain = !!domain?.customDomain;
  const hasSiteNow = treeHasSite(tree);
  const doPublish = () => { setPublishOpen(true); onPublish(); };
  const closePublish = () => { setPublishOpen(false); onClearPublishResult?.(); };

  // Menu overflow « ⋯ » : Inviter (collab) · Gérer le domaine (si publié) ·
  // Télécharger le .zip. Actions à basse fréquence sorties de la barre.
  const overflow: MenuItem[] = [];
  if (canShare) overflow.push({ key: 'invite', label: t.menu.invite, icon: <IconUsers />, onClick: () => setShareOpen(true) });
  if (github && canPublish) overflow.push({ key: 'github', label: t.menu.github, icon: <IconGit />, onClick: () => setGithubOpen(true) });
  if (publishUrl && onConnectDomain && onRemoveDomain) overflow.push({ key: 'domain', label: hasDomain ? domain!.customDomain! : t.menu.domain, icon: <IconGlobe />, onClick: () => setDomainOpen(true) });
  if (onDownload) overflow.push({ key: 'download', label: t.menu.download, icon: <IconDownload />, disabled: !canDownload || downloading, onClick: onDownload });

  return (
    <section className="sv-prev">
      <div className="sv-prev__bar">
        <span className={'sv-tab' + (mode === 'preview' ? ' sv-tab--on' : '')} onClick={() => onMode('preview')}><IconEye width={14} height={14} style={{ verticalAlign: '-2px', marginRight: 5 }} />{t.preview}</span>
        <span className={'sv-tab' + (mode === 'files' ? ' sv-tab--on' : '')} onClick={() => onMode('files')}><IconCode width={14} height={14} style={{ verticalAlign: '-2px', marginRight: 5 }} />{t.files}</span>
        <div className="sv-prev__bar-r">
          {/* Publié → lien "Online" (voir le site live) + bouton "Republier" (re-déployer
              les changements). Non publié → juste le bouton "Publier". Les deux coexistent
              quand c'est publié : on garde toujours l'accès au re-déploiement. */}
          {publishUrl && (
            <a className="sv-btn sv-live" href={publishUrl} target="_blank" rel="noreferrer" title={t.onlineSite}><span className="sv-live__dot" /> {t.online}</a>
          )}
          <button
            className="sv-btn sv-btn--primary"
            disabled={!canPublish || publishing}
            onClick={doPublish}
            title={!canPublish ? t.cantPublish : publishUrl ? t.republish : t.publish}
          >
            {publishing && <span className="sv-btn__spin" />}
            {publishing ? t.publishing : publishUrl ? t.republish : t.publish}
          </button>
          <button className="sv-btn sv-btn--ghost sv-btn--icon" title={t.refresh} aria-label={t.refresh} onClick={onRefresh}><IconRefresh /></button>
          <button className="sv-btn sv-btn--ghost sv-btn--icon sv-prev__open" title={t.openTab} aria-label={t.openTab} onClick={onOpen}><IconExpand /></button>
          {/* Menu « ⋯ » : actions ponctuelles (collaboration, domaine, export) hors
              de la boucle d'itération quotidienne → une seule entrée au lieu de 3 boutons. */}
          {overflow.length > 0 && (
            <Menu items={overflow} className="sv-btn sv-btn--ghost sv-btn--icon" title={t.menu.more} ariaLabel={t.menu.more} align="right">
              <IconDots />
            </Menu>
          )}
        </div>
      </div>
      {mode === 'preview' ? (
        // Un site servable existe → iframe (+ bande d'activité si un tour tourne :
        // modification par-dessus le site, ou « répond dans le chat »). Sinon :
        // build en cours → vue live (ghost + feed) ; tour fini sans fichier →
        // « pas encore de site » ; rien du tout → accueil + suggestions.
        hasSiteNow
          ? <div className="sv-prev__body">
              <iframe
                className="sv-prev__frame"
                src={previewUrl ?? undefined}
                title="preview"
                onLoad={() => {
                  if (previewUrl && previewTrackedRef.current !== previewUrl) {
                    previewTrackedRef.current = previewUrl;
                    pushDataLayer('app_preview_rendered', {});
                  }
                }}
              />
              {building && <ActivityStrip steps={activitySteps} fileWrite={fileWrite} />}
            </div>
          : building
            ? <BuildingView steps={activitySteps} />
            : hasMessages
              ? <NoSiteView onFocusChat={onFocusChat} />
              : <PreviewEmpty building={false} hasMessages={false} onSuggest={onSuggest} github={github} pendingRepo={pendingRepo} onSetPendingRepo={onSetPendingRepo} />
      ) : (
        tree.length ? <div className="sv-tree"><Tree nodes={tree} /></div> : <div className="sv-empty">{t.noFiles}</div>
      )}
      {domainOpen && domain && onConnectDomain && onRemoveDomain && (
        <DomainManager
          domain={domain}
          onConnect={onConnectDomain}
          onRemove={() => { onRemoveDomain(); }}
          onClose={() => setDomainOpen(false)}
        />
      )}
      {shareOpen && canShare && (
        <ShareDialog
          onCreate={onCreateInvite!}
          onList={onListInvites!}
          onRevoke={onRevokeInvite!}
          onClose={() => setShareOpen(false)}
        />
      )}
      {githubOpen && github && (
        <GitHubConnect github={github} onClose={() => setGithubOpen(false)} />
      )}
      {publishOpen && (
        <PublishModal publishing={publishing} result={publishResult ?? null} onClose={closePublish} onRetry={doPublish} />
      )}
    </section>
  );
}
