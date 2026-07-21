import { useEffect, useMemo, useRef, useState } from 'react';
import { modelGroupsFor, labelFor, type ModelGroup } from '../lib/models';
import { useStrings } from '../lib/i18n';

interface Props { value: string; onChange: (id: string) => void; isAdmin?: boolean; groups?: ModelGroup[]; }

export function ModelSelector({ value, onChange, isAdmin, groups: groupsProp }: Props) {
  const st = useStrings();
  // Liste fournie par le broker (avec dispo) si dispo, sinon fallback local.
  const groups = useMemo(() => groupsProp ?? modelGroupsFor(!!isAdmin), [groupsProp, isAdmin]);
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
      <button className="sv-btn sv-btn--ghost" onClick={() => setOpen((o) => !o)} title={st.agentModel}>
        <span className="sv-model__dot" /> {labelFor(value)}
        <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="m6 9 6 6 6-6" /></svg>
      </button>
      {open && (
        <div className="sv-model__menu">
          {groups.map((g) => (
            <div key={g.label}>
              <div className="sv-model__grp">{g.label}</div>
              {g.models.map((m) => {
                // available absent (fallback) = supposé dispo ; false = provider down.
                const unavailable = m.available === false;
                // locked = tier de l'user en dessous du minTier du modèle (upsell).
                const locked = m.locked === true;
                const disabled = unavailable || locked;
                // Tag du tier requis (masqué pour free).
                const tierTag = m.minTier && m.minTier !== 'free' ? m.minTier.toUpperCase() : null;
                return (
                <button key={m.id} disabled={disabled}
                  className={'sv-model__opt' + (m.id === value ? ' sv-model__opt--on' : '') + (disabled ? ' sv-model__opt--off' : '')}
                  title={unavailable ? st.modelUnavailable : locked && tierTag ? `${tierTag}+` : undefined}
                  onClick={() => { if (!disabled) { onChange(m.id); setOpen(false); } }}>
                  <span className={'sv-model__dot sv-model__dot--' + m.provider} /> {m.label}
                  {unavailable
                    ? <span className="sv-model__tag sv-model__tag--off">{st.modelOffline}</span>
                    : tierTag
                    ? <span className="sv-model__tag" style={{ color: locked ? 'var(--sv-warn)' : 'var(--sv-accent-2)' }}>{tierTag}</span>
                    : null}
                </button>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
