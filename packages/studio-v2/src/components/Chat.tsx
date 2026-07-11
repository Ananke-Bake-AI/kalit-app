import { useEffect, useRef, useState, type DragEvent } from 'react';
import type { Activity, Message, Segment } from '../lib/types';
import { IconAttach, IconSend, IconStop } from '../lib/icons';
import { ModelSelector } from './ModelSelector';
import { useStrings } from '../lib/i18n';
import { Md } from '../lib/markdown';

// Immersive/focus toggle: hides the global Kalit header + banners so the studio
// fills the whole viewport. The focus state lives in the landing's
// StudioFocusProvider (another package), so we drive it through a window-event
// bridge: fire `kalit:studio-focus-toggle`, and mirror the icon from the
// `kalit:studio-focus-state` events it broadcasts back (+ localStorage on load).
function FullscreenBtn({ label }: { label: string }) {
  const [focus, setFocus] = useState(false);
  useEffect(() => {
    try { setFocus(window.localStorage.getItem('studio-focus-mode') === '1'); } catch { /* ignore */ }
    const on = (e: Event) => setFocus(!!(e as CustomEvent).detail);
    window.addEventListener('kalit:studio-focus-state', on);
    return () => window.removeEventListener('kalit:studio-focus-state', on);
  }, []);
  const toggle = () => window.dispatchEvent(new Event('kalit:studio-focus-toggle'));
  return (
    <button className="sv-btn sv-btn--ghost sv-iconbtn" onClick={toggle} title={label} aria-label={label}>
      {focus
        ? <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" /></svg>
        : <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" /></svg>}
    </button>
  );
}

interface Props {
  title: string;
  messages: Message[];
  streaming: boolean;
  activity: Activity | null;
  model: string;
  onModelChange: (id: string) => void;
  onSend: (text: string) => void;
  onStop: () => void;
  onChoiceAnswer: (text: string) => void;
  ctxPercent?: number | null;
  attachments?: { id: string; name: string }[];
  uploading?: boolean;
  onAddFiles?: (files: File[]) => void;
  onRemoveAttachment?: (id: string) => void;
  outOfCredits?: boolean;
  pricingHref?: string;
}

function ChoiceView({ s, onAnswer }: { s: Extract<Segment, { kind: 'choice' }>; onAnswer: (t: string) => void }) {
  const st = useStrings();
  const [sel, setSel] = useState<string[]>([]);
  if (s.answered) {
    return (
      <div className="sv-choice sv-choice--locked">
        <div className="sv-choice__q">{s.question}</div>
        <div className="sv-choice__opts">{s.options.map((o) => <span key={o.label} className="sv-choice__pill">{o.label}</span>)}</div>
      </div>
    );
  }
  const toggle = (label: string) => {
    if (!s.multiSelect) { onAnswer(label); return; }
    setSel((p) => p.includes(label) ? p.filter((x) => x !== label) : [...p, label]);
  };
  return (
    <div className="sv-choice">
      <div className="sv-choice__q">{s.question}</div>
      <div className="sv-choice__opts">
        {s.options.map((o) => (
          <button key={o.label} className={'sv-choice__opt' + (sel.includes(o.label) ? ' sv-choice__opt--on' : '')} onClick={() => toggle(o.label)}>
            <span className="sv-choice__label">{o.label}</span>
            {o.description && <span className="sv-choice__desc">{o.description}</span>}
          </button>
        ))}
      </div>
      {s.multiSelect && <button className="sv-btn sv-btn--primary" disabled={!sel.length} onClick={() => onAnswer(sel.join(', '))}>{st.validate}</button>}
      {s.freeform && <div className="sv-choice__free">{st.answerFreely}</div>}
    </div>
  );
}

function SegmentView({ s, onChoiceAnswer }: { s: Segment; onChoiceAnswer: (t: string) => void }) {
  const st = useStrings();
  if (s.kind === 'text') return <div className="sv-msg__text sv-md"><Md text={s.content} /></div>;
  if (s.kind === 'thinking') return (
    <div className="sv-think"><div className="sv-think__l">{st.thinking}</div><div className="sv-think__t">{s.content}</div></div>
  );
  if (s.kind === 'tool') return (
    <div className="sv-tool">⚙ {s.name}{s.input ? <span className="sv-tool__arg">{s.input}</span> : null}{s.done ? ' ·' : '…'}</div>
  );
  if (s.kind === 'file') return <div className="sv-tool">↓ {s.name}</div>;
  if (s.kind === 'error') return <div className="sv-err">{s.content}</div>;
  if (s.kind === 'choice') return <ChoiceView s={s} onAnswer={onChoiceAnswer} />;
  return null;
}

export function Chat({ title, messages, streaming, activity, model, onModelChange, onSend, onStop, onChoiceAnswer, ctxPercent, attachments = [], uploading, onAddFiles, onRemoveAttachment, outOfCredits, pricingHref }: Props) {
  const st = useStrings();
  const [val, setVal] = useState('');
  // Historique des prompts envoyés (terminal-style ↑/↓), persisté pour ne pas
  // les perdre au reload. histPos = -1 → brouillon courant ; 0..n → navigation.
  const HIST_KEY = 'sv-prompt-history';
  const histRef = useRef<string[]>([]);
  const histPosRef = useRef(-1);
  const draftRef = useRef('');
  const taRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { try { const h = JSON.parse(localStorage.getItem(HIST_KEY) || '[]'); if (Array.isArray(h)) histRef.current = h; } catch { /* ignore */ } }, []);
  const caretToEnd = () => requestAnimationFrame(() => { const el = taRef.current; if (el) { el.selectionStart = el.selectionEnd = el.value.length; } });
  const feedRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [, force] = useState(0);

  const pickFiles = (fl: FileList | null) => { if (fl && fl.length && onAddFiles) onAddFiles(Array.from(fl)); };
  const onDrop = (e: DragEvent<HTMLElement>) => { e.preventDefault(); setDragging(false); pickFiles(e.dataTransfer.files); };

  useEffect(() => { feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight }); }, [messages, activity]);
  // heartbeat pour le temps écoulé de l'indicateur d'activité
  useEffect(() => { if (!activity) return; const t = setInterval(() => force((n) => n + 1), 1000); return () => clearInterval(t); }, [activity]);

  const send = () => {
    const t = val.trim();
    if ((!t && !attachments.length) || streaming) return;
    if (t) {
      const h = histRef.current;
      if (h[0] !== t) { h.unshift(t); if (h.length > 20) h.length = 20; try { localStorage.setItem(HIST_KEY, JSON.stringify(h)); } catch { /* ignore */ } }
    }
    histPosRef.current = -1; draftRef.current = '';
    onSend(t); setVal('');
  };
  const elapsed = activity ? Math.floor((Date.now() - activity.since) / 1000) : 0;

  return (
    <section className="sv-chat"
      onDragOver={(e) => { if (onAddFiles) { e.preventDefault(); setDragging(true); } }}
      onDragLeave={(e) => { if (e.currentTarget === e.target) setDragging(false); }}
      onDrop={onDrop}
    >
      {dragging && <div className="sv-drop"><div className="sv-drop__in">{st.dropHere}</div></div>}
      <div className="sv-chat__bar">
        <span className="sv-chat__title">{title}</span>
        <div className="sv-chat__bar-r">
          {typeof ctxPercent === 'number' && (
            <span className="sv-chip" title={st.ctxUsed}>ctx {ctxPercent}%</span>
          )}
          <ModelSelector value={model} onChange={onModelChange} />
          <FullscreenBtn label={st.fullscreen} />
        </div>
      </div>

      <div className="sv-feed" ref={feedRef}>
        {messages.map((m) => (
          <div key={m.id} className={'sv-msg ' + (m.role === 'user' ? 'sv-msg--user' : 'sv-msg--asst')}>
            <div className="sv-msg__av">{m.role === 'user' ? 'V' : 'K'}</div>
            <div className="sv-msg__body">
              <div className="sv-msg__name">{m.role === 'user' ? st.you : 'Kalit'}</div>
              {m.segments.map((s, i) => <SegmentView key={i} s={s} onChoiceAnswer={onChoiceAnswer} />)}
            </div>
          </div>
        ))}
      </div>

      {activity && (
        <div className="sv-activity">
          <span className="sv-activity__dot" />{activity.label}
          {elapsed >= 2 && <span className="sv-activity__t">{elapsed}s</span>}
        </div>
      )}

      {outOfCredits && (
        <div className="sv-credits" role="alert">
          <span className="sv-credits__msg">{st.errors.credits}</span>
          <a className="sv-btn sv-btn--primary sv-credits__cta" href={pricingHref || '/pricing'}>{st.upgrade}</a>
        </div>
      )}

      <div className="sv-composer">
        <div className="sv-composer__box">
          {(attachments.length > 0 || uploading) && (
            <div className="sv-atts">
              {attachments.map((a) => (
                <span key={a.id} className="sv-att" title={a.name}>
                  <IconAttach width={12} height={12} />
                  <span className="sv-att__n">{a.name}</span>
                  <button className="sv-att__x" onClick={() => onRemoveAttachment?.(a.id)} aria-label="remove">×</button>
                </span>
              ))}
              {uploading && <span className="sv-att sv-att--load"><span className="sv-btn__spin" /></span>}
            </div>
          )}
          <textarea
            ref={taRef}
            value={val} onChange={(e) => { setVal(e.target.value); histPosRef.current = -1; }}
            onKeyDown={(e) => {
              const ta = e.currentTarget;
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); return; }
              // ↑ = prompt précédent (seulement caret tout en haut → l'édition multi-ligne reste possible)
              if (e.key === 'ArrowUp' && ta.selectionStart === 0 && ta.selectionEnd === 0) {
                const h = histRef.current; if (!h.length) return;
                if (histPosRef.current === -1) draftRef.current = val;
                histPosRef.current = Math.min(histPosRef.current + 1, h.length - 1);
                setVal(h[histPosRef.current]); caretToEnd(); e.preventDefault(); return;
              }
              // ↓ = revenir vers le brouillon
              if (e.key === 'ArrowDown' && histPosRef.current >= 0) {
                const h = histRef.current; histPosRef.current -= 1;
                setVal(histPosRef.current < 0 ? draftRef.current : h[histPosRef.current]); caretToEnd(); e.preventDefault(); return;
              }
              // Ctrl/Cmd+Z sur composer vide → restaure le dernier prompt envoyé
              if ((e.key === 'z' || e.key === 'Z') && (e.ctrlKey || e.metaKey) && !e.shiftKey && !val.trim()) {
                const h = histRef.current; if (h.length) { setVal(h[0]); histPosRef.current = 0; draftRef.current = ''; caretToEnd(); e.preventDefault(); }
                return;
              }
            }}
            placeholder={st.composerPlaceholder} rows={1}
          />
          <div className="sv-composer__row">
            <button className="sv-btn sv-btn--ghost sv-btn--icon" title={st.attach} onClick={() => fileRef.current?.click()} disabled={!onAddFiles}><IconAttach /></button>
            <input ref={fileRef} type="file" multiple style={{ display: 'none' }} onChange={(e) => { pickFiles(e.target.files); e.target.value = ''; }} />
            <div className="sv-composer__row-r">
              <span className="sv-kbd">⏎</span>
              {streaming
                ? <button className="sv-btn" onClick={onStop}><IconStop /> {st.stop}</button>
                : <button className="sv-btn sv-btn--primary" onClick={send} disabled={!val.trim() && !attachments.length}><IconSend /> {st.send}</button>}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
