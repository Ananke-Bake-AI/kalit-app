import { useState } from 'react';
import type { Activity, FileNode, Message, PreviewMode, Session } from './lib/types';
import { Sidebar } from './components/Sidebar';
import { Chat } from './components/Chat';
import { Preview } from './components/Preview';
import { IconFolder, IconEye } from './lib/icons';
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
  user: { name: string; credits?: number };
  ctxPercent?: number | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onSend: (text: string) => void;
  onStop: () => void;
  onRefreshTree: () => void;
}

/** Shell présentation pur : reçoit l'état et les callbacks, ne connaît pas le
 *  transport. L'adaptateur broker (à venir) fournit ces props depuis le
 *  broker-client + le hook socket, en respectant le contrat WS/REST. */
export function StudioShell(props: StudioShellProps) {
  const [mode, setMode] = useState<PreviewMode>('preview');
  const [pane, setPane] = useState<MobilePane>('chat');
  const active = props.sessions.find((s) => s.id === props.activeId);

  // en mobile, sélectionner une session bascule automatiquement sur le chat
  const selectMobile = (id: string) => { props.onSelect(id); setPane('chat'); };

  return (
    <div className="sv sv-shell" data-pane={pane}>
      <Sidebar sessions={props.sessions} activeId={props.activeId} user={props.user} onSelect={selectMobile} onNew={() => { props.onNew(); setPane('chat'); }} />
      <Chat
        title={active?.title ?? 'Nouveau projet'}
        messages={props.messages} streaming={props.streaming} activity={props.activity}
        ctxPercent={props.ctxPercent} onSend={props.onSend} onStop={props.onStop}
      />
      <Preview
        mode={mode} onMode={setMode} previewUrl={props.previewUrl} tree={props.tree}
        onRefresh={props.onRefreshTree} onOpen={() => props.previewUrl && window.open(props.previewUrl, '_blank')}
      />
      <nav className="sv-mnav" aria-label="Navigation">
        <button aria-selected={pane === 'sessions'} onClick={() => setPane('sessions')}><IconFolder /> Projets</button>
        <button aria-selected={pane === 'chat'} onClick={() => setPane('chat')}><ChatIcon /> Chat</button>
        <button aria-selected={pane === 'preview'} onClick={() => setPane('preview')}><IconEye /> Aperçu</button>
      </nav>
    </div>
  );
}
