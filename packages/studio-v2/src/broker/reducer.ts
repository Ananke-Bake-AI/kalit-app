// Stream reducer : transforme les RawEvent du broker (contrat §3) en segments UI.
// Règle clé (fidèle au studio actuel) : le TEXTE est bufferisé et flushé quand
// un event non-texte arrive ou en fin de flux — pas de rendu token-par-token
// incohérent. Le thinking est accumulé à part.

import type { Segment } from '../lib/types';

export interface RawEvent {
  type?: string;
  content?: string;
  name?: string;
  input?: unknown;
  mimeType?: string;
  url?: string;
  // widget/progress/choice : gérés dans la brique widgets (tolérés ici sans casser)
  [k: string]: unknown;
}

export type ReducerResult = 'ongoing' | 'terminal';

export class StreamReducer {
  segments: Segment[] = [];
  thinking = '';
  private textBuf = '';

  constructor(private onChange: () => void) {}

  private flushText() {
    if (this.textBuf) {
      this.segments.push({ kind: 'text', content: this.textBuf });
      this.textBuf = '';
    }
  }

  apply(ev: RawEvent): ReducerResult {
    switch (ev.type) {
      case 'text':
        this.textBuf += ev.content ?? '';
        this.onChange();
        return 'ongoing';

      case 'thinking':
        this.flushText();
        this.thinking += ev.content ?? '';
        this.onChange();
        return 'ongoing';

      case 'tool_use': {
        this.flushText();
        const input = ev.input && typeof ev.input === 'object' ? JSON.stringify(ev.input) : String(ev.input ?? '');
        this.segments.push({ kind: 'tool', name: String(ev.name ?? 'tool'), input: input.slice(0, 200), done: false });
        this.onChange();
        return 'ongoing';
      }

      case 'tool_result': {
        for (let i = this.segments.length - 1; i >= 0; i--) {
          const s = this.segments[i];
          if (s.kind === 'tool' && !s.done) { s.done = true; break; }
        }
        this.onChange();
        return 'ongoing';
      }

      case 'file':
        this.flushText();
        this.segments.push({ kind: 'file', name: String(ev.name ?? 'fichier'), url: String(ev.url ?? ''), mimeType: ev.mimeType });
        this.onChange();
        return 'ongoing';

      case 'error':
        this.flushText();
        this.segments.push({ kind: 'error', content: String(ev.content ?? 'Une erreur est survenue.') });
        this.onChange();
        return 'ongoing';

      case 'idle':
      case 'stream_closed':
        this.flushText();
        this.onChange();
        return 'terminal';

      // widget / progress / choice / error / suite_selected : à traiter dans les
      // briques suivantes. On flushe le texte pour ne pas figer l'affichage.
      default:
        this.flushText();
        this.onChange();
        return 'ongoing';
    }
  }

  /** Segments consolidés incluant le buffer texte courant (pour le rendu live). */
  render(): { segments: Segment[]; thinking: string } {
    const segs = this.textBuf ? [...this.segments, { kind: 'text' as const, content: this.textBuf }] : this.segments;
    return { segments: segs, thinking: this.thinking };
  }
}
