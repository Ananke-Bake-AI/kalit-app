import { useEffect, useMemo, useRef, useState } from 'react';
import { modelGroupsFor, labelFor, type ModelGroup } from '../lib/models';
import { useStrings } from '../lib/i18n';
import { pushDataLayer } from '../lib/analytics';

interface Props { value: string; onChange: (id: string) => void; isAdmin?: boolean; groups?: ModelGroup[]; pricingHref?: string; }

export function ModelSelector({ value, onChange, isAdmin, groups: groupsProp, pricingHref }: Props) {
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
                // locked = tier de l'user en dessous du minTier du modèle. Pas
                // disabled : cliquer un modèle verrouillé ouvre le pricing —
                // c'est LA vitrine d'upgrade du studio.
                const locked = m.locked === true;
                // Tag du tier pour TOUS les modèles (FREE inclus, en gris muté) —
                // couleur : verrouillé → warn, free → muté, payant dispo → accent.
                const tier = m.minTier || 'free';
                const tierTag = tier.toUpperCase();
                const tierColor = locked ? 'var(--sv-warn)' : tier === 'free' ? 'var(--sv-text-3)' : 'var(--sv-accent-2)';
                return (
                <button key={m.id} disabled={unavailable}
                  className={'sv-model__opt' + (m.id === value ? ' sv-model__opt--on' : '') + (unavailable ? ' sv-model__opt--off' : '') + (locked ? ' sv-model__opt--locked' : '')}
                  title={unavailable ? st.modelUnavailable : locked ? st.modelLocked : undefined}
                  onClick={() => {
                    if (unavailable) return;
                    if (locked) {
                      pushDataLayer('upgrade_clicked', { surface: 'studio', mode: 'locked_model', model: m.id });
                      window.open(pricingHref || '/pricing', '_blank', 'noopener');
                      setOpen(false);
                      return;
                    }
                    onChange(m.id); setOpen(false);
                  }}>
                  <span className={'sv-model__dot sv-model__dot--' + m.provider} /> {m.label}
                  {locked && (
                    <svg className="sv-model__lock" width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                  )}
                  {unavailable
                    ? <span className="sv-model__tag sv-model__tag--off">{st.modelOffline}</span>
                    : <span className="sv-model__tag" style={{ color: tierColor }}>{tierTag}</span>}
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
