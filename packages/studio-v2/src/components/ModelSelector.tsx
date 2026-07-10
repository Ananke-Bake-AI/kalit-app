import { useEffect, useRef, useState } from 'react';
import { MODEL_GROUPS, labelFor } from '../lib/models';

interface Props { value: string; onChange: (id: string) => void; }

export function ModelSelector({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  return (
    <div className="sv-model" ref={ref}>
      <button className="sv-btn sv-btn--ghost" onClick={() => setOpen((o) => !o)} title="Modèle de l'agent">
        <span className="sv-model__dot" /> {labelFor(value)}
        <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="m6 9 6 6 6-6" /></svg>
      </button>
      {open && (
        <div className="sv-model__menu">
          {MODEL_GROUPS.map((g) => (
            <div key={g.label}>
              <div className="sv-model__grp">{g.label}</div>
              {g.models.map((m) => (
                <button key={m.id} className={'sv-model__opt' + (m.id === value ? ' sv-model__opt--on' : '')}
                  onClick={() => { onChange(m.id); setOpen(false); }}>
                  <span className={'sv-model__dot sv-model__dot--' + m.provider} /> {m.label}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
