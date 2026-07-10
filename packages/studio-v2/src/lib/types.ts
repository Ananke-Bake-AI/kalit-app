// Types UI du studio v2 (couche présentation). Le mapping vers le contrat
// broker (ChatSession, ChatMessage, StreamSegment, RawEvent) se fait dans
// l'adaptateur broker — ici on reste agnostique du transport.

export type SessionStatus = 'running' | 'idle' | 'archived';

export interface Session {
  id: string;
  title: string;
  status: SessionStatus;
  model?: string;
  updatedAt: number;
}

export type Segment =
  | { kind: 'text'; content: string }
  | { kind: 'thinking'; content: string }
  | { kind: 'tool'; name: string; input?: string; done?: boolean }
  | { kind: 'file'; name: string; url: string; mimeType?: string }
  | { kind: 'error'; content: string };

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  segments: Segment[];
}

export type PreviewMode = 'preview' | 'files';

export interface FileNode {
  name: string;
  path: string;
  dir: boolean;
  size?: number;
  collapsed?: boolean;
  children?: FileNode[];
}

export interface Activity {
  label: string;
  since: number;
}
