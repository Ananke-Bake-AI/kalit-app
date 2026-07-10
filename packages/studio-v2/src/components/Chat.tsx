import { useEffect, useRef, useState } from 'react';
import type { Activity, Message, Segment } from '../lib/types';
import { IconAttach, IconSend, IconStop } from '../lib/icons';
import { ModelSelector } from './ModelSelector';
import { useStrings } from '../lib/i18n';

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
  if (s.kind === 'text') return <div className="sv-msg__text">{s.content}</div>;
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

export function Chat({ title, messages, streaming, activity, model, onModelChange, onSend, onStop, onChoiceAnswer, ctxPercent }: Props) {
  const st = useStrings();
  const [val, setVal] = useState('');
  const feedRef = useRef<HTMLDivElement>(null);
  const [, force] = useState(0);

  useEffect(() => { feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight }); }, [messages, activity]);
  // heartbeat pour le temps écoulé de l'indicateur d'activité
  useEffect(() => { if (!activity) return; const t = setInterval(() => force((n) => n + 1), 1000); return () => clearInterval(t); }, [activity]);

  const send = () => { const t = val.trim(); if (!t || streaming) return; onSend(t); setVal(''); };
  const elapsed = activity ? Math.floor((Date.now() - activity.since) / 1000) : 0;

  return (
    <section className="sv-chat">
      <div className="sv-chat__bar">
        <span className="sv-chat__title">{title}</span>
        <div className="sv-chat__bar-r">
          {typeof ctxPercent === 'number' && (
            <span className="sv-chip" title={st.ctxUsed}>ctx {ctxPercent}%</span>
          )}
          <ModelSelector value={model} onChange={onModelChange} />
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

      <div className="sv-composer">
        <div className="sv-composer__box">
          <textarea
            value={val} onChange={(e) => setVal(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder={st.composerPlaceholder} rows={1}
          />
          <div className="sv-composer__row">
            <button className="sv-btn sv-btn--ghost sv-btn--icon" title={st.attach}><IconAttach /></button>
            <div className="sv-composer__row-r">
              <span className="sv-kbd">⏎</span>
              {streaming
                ? <button className="sv-btn" onClick={onStop}><IconStop /> {st.stop}</button>
                : <button className="sv-btn sv-btn--primary" onClick={send} disabled={!val.trim()}><IconSend /> {st.send}</button>}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
