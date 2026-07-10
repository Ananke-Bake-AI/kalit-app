import { useMemo, useState } from 'react';
import type { Session } from '../lib/types';
import { IconLogo, IconPlus, IconSearch } from '../lib/icons';

interface Props {
  sessions: Session[];
  activeId: string | null;
  user: { name: string; credits?: number };
  onSelect: (id: string) => void;
  onNew: () => void;
}

const DOT: Record<Session['status'], string> = { running: 'sv-dot--run', idle: 'sv-dot--idle', archived: 'sv-dot--arch' };
const LABEL: Record<Session['status'], string> = { running: 'en cours', idle: 'prêt', archived: 'archivé' };

export function Sidebar({ sessions, activeId, user, onSelect, onNew }: Props) {
  const [q, setQ] = useState('');
  const filtered = useMemo(
    () => sessions.filter((s) => s.title.toLowerCase().includes(q.toLowerCase())).sort((a, b) => b.updatedAt - a.updatedAt),
    [sessions, q],
  );
  return (
    <aside className="sv-side">
      <div className="sv-side__top">
        <span className="sv-brand"><IconLogo /> Studio</span>
      </div>
      <button className="sv-btn sv-btn--primary sv-side__new" onClick={onNew}><IconPlus /> Nouveau projet</button>
      <div style={{ padding: '0 12px 8px' }}>
        <div className="sv-composer__box" style={{ padding: '6px 10px', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <IconSearch style={{ color: 'var(--sv-text-3)', flexShrink: 0 }} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher…"
            style={{ border: 0, background: 'transparent', color: 'var(--sv-text)', font: 'inherit', outline: 'none', width: '100%' }} />
        </div>
      </div>
      <div className="sv-side__list">
        {filtered.length === 0 && <div className="sv-side__group">Aucun projet</div>}
        {filtered.map((s) => (
          <div key={s.id} className={'sv-sess' + (s.id === activeId ? ' sv-sess--active' : '')} onClick={() => onSelect(s.id)}>
            <div className="sv-sess__title">{s.title}</div>
            <div className="sv-sess__meta"><span className={'sv-dot ' + DOT[s.status]} /> {LABEL[s.status]}{s.model ? ` · ${s.model.split('/').pop()}` : ''}</div>
          </div>
        ))}
      </div>
      <div className="sv-side__foot">
        <div className="sv-avatar">{user.name.slice(0, 1).toUpperCase()}</div>
        <span style={{ fontSize: 13, color: 'var(--sv-text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</span>
        {typeof user.credits === 'number' && <span className="sv-credits">{user.credits} crédits</span>}
      </div>
    </aside>
  );
}
