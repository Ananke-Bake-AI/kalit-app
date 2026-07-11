import { useState } from 'react';
import type { Activity, FileNode, Message, PreviewMode, Session } from './lib/types';
import type { DomainState } from './broker/useBrokerStudio';
import { Sidebar } from './components/Sidebar';
import { Chat } from './components/Chat';
import { Preview } from './components/Preview';
import { IconFolder, IconEye } from './lib/icons';
import { StringsContext, stringsFor } from './lib/i18n';
import './styles/theme.css';
import './components/shell.css';

type MobilePane = 'sessions' | 'chat' | 'preview';
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
  ctxPercent?: number | null;
  model: string;
  lang?: string;
  onModelChange: (id: string) => void;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string, mode: 'session' | 'project') => void;
  onSend: (text: string) => void;
  onStop: () => void;
  onRefreshTree: () => void;
  attachments?: { id: string; name: string }[];
  uploading?: boolean;
  onAddFiles?: (files: File[]) => void;
  onRemoveAttachment?: (id: string) => void;
  outOfCredits?: boolean;
  deployBlocked?: boolean;
  onDismissDeployBlocked?: () => void;
  storage?: { usedBytes: number; limitBytes: number } | null;
  storageBlocked?: boolean;
  onDismissStorageBlocked?: () => void;
  domain?: DomainState;
  onConnectDomain?: (domain: string) => Promise<{ ok: boolean; error?: string }>;
  onRemoveDomain?: () => void;
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

  return (
    <StringsContext.Provider value={t}>
    <div className="sv sv-shell" data-pane={pane}>
      <Sidebar sessions={props.sessions} activeId={props.activeId} user={props.user} storage={props.storage ?? null} onSelect={selectMobile} onNew={() => { props.onNew(); setPane('chat'); }} onDelete={props.onDelete} />
      <Chat
        title={active?.title ?? t.newProject}
        messages={props.messages} streaming={props.streaming} activity={props.activity}
        ctxPercent={props.ctxPercent} model={props.model} onModelChange={props.onModelChange}
        onSend={props.onSend} onStop={props.onStop} onChoiceAnswer={props.onSend}
        attachments={props.attachments} uploading={props.uploading}
        onAddFiles={props.onAddFiles} onRemoveAttachment={props.onRemoveAttachment}
        outOfCredits={props.outOfCredits} pricingHref={`/${props.lang || 'en'}/pricing`}
      />
      <Preview
        mode={mode} onMode={setMode} previewUrl={props.previewUrl} tree={props.tree}
        publishUrl={props.publishUrl ?? null} publishing={!!props.publishing} canPublish={!!props.canPublish} onPublish={props.onPublish ?? (() => {})}
        canDownload={!!props.canDownload} downloading={!!props.downloading} onDownload={props.onDownload ?? (() => {})}
        onRefresh={props.onRefreshTree} onOpen={() => props.previewUrl && window.open(props.previewUrl, '_blank')}
        building={props.streaming} hasMessages={props.messages.length > 0} onSuggest={sendSuggest}
        domain={props.domain} onConnectDomain={props.onConnectDomain} onRemoveDomain={props.onRemoveDomain}
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
              <a className="sv-btn sv-btn--primary" href={`/${props.lang || 'en'}/pricing`} target="_blank" rel="noreferrer">{t.upgrade}</a>
              <button className="sv-btn sv-btn--ghost" onClick={() => props.onDismissStorageBlocked?.()}>{t.storage.close}</button>
            </div>
          </div>
        </div>
      )}
    </div>
    </StringsContext.Provider>
  );
}
