import { useMemo, useState } from 'react';
import type { Session } from '../lib/types';
import { IconLogo, IconPlus, IconSearch, IconDots, IconTrash, IconClose } from '../lib/icons';
import { useStrings } from '../lib/i18n';

interface Props {
  sessions: Session[];
  activeId: string | null;
  user: { name: string; credits?: number };
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string, mode: 'session' | 'project') => void;
}

const DOT: Record<Session['status'], string> = { running: 'sv-dot--run', idle: 'sv-dot--idle', archived: 'sv-dot--arch' };

export function Sidebar({ sessions, activeId, user, onSelect, onNew, onDelete }: Props) {
  const st = useStrings();
  const LABEL: Record<Session['status'], string> = { running: st.running, idle: st.ready, archived: st.archived };
  const [q, setQ] = useState('');
  const [deleting, setDeleting] = useState<Session | null>(null);
  const [busy, setBusy] = useState(false);
  const filtered = useMemo(
    () => sessions.filter((s) => s.title.toLowerCase().includes(q.toLowerCase())).sort((a, b) => b.updatedAt - a.updatedAt),
    [sessions, q],
  );

  const doDelete = (mode: 'session' | 'project') => {
    if (!deleting) return;
    setBusy(true);
    onDelete(deleting.id, mode);
    // La suppression est optimiste côté hook ; on ferme aussitôt.
    setBusy(false);
    setDeleting(null);
  };

  return (
    <aside className="sv-side">
      <div className="sv-side__top">
        <span className="sv-brand"><IconLogo /> Studio</span>
      </div>
      <button className="sv-btn sv-btn--primary sv-side__new" onClick={onNew}><IconPlus /> {st.newProject}</button>
      <div style={{ padding: '0 12px 8px' }}>
        <div className="sv-composer__box" style={{ padding: '6px 10px', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <IconSearch style={{ color: 'var(--sv-text-3)', flexShrink: 0 }} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={st.searchPlaceholder}
            style={{ border: 0, background: 'transparent', color: 'var(--sv-text)', font: 'inherit', outline: 'none', width: '100%' }} />
        </div>
      </div>
      <div className="sv-side__list">
        {filtered.length === 0 && <div className="sv-side__group">{st.noProjects}</div>}
        {filtered.map((s) => (
          <div key={s.id} className={'sv-sess' + (s.id === activeId ? ' sv-sess--active' : '')} onClick={() => onSelect(s.id)}>
            <div className="sv-sess__body">
              <div className="sv-sess__title">{s.title}</div>
              <div className="sv-sess__meta"><span className={'sv-dot ' + DOT[s.status]} /> {LABEL[s.status]}{s.model ? ` · ${s.model.split('/').pop()}` : ''}</div>
            </div>
            <button
              className="sv-sess__more"
              title={st.del.confirm}
              aria-label={st.del.confirm}
              onClick={(e) => { e.stopPropagation(); setDeleting(s); }}
            >
              <IconDots />
            </button>
          </div>
        ))}
      </div>
      {typeof user.credits === 'number' && (
        <div className="sv-side__foot"><span className="sv-credits">{user.credits}</span></div>
      )}

      {deleting && (
        <div className="sv-modal" onClick={() => !busy && setDeleting(null)}>
          <div className="sv-modal__panel" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <button className="sv-modal__x" onClick={() => setDeleting(null)} aria-label={st.del.cancel}><IconClose /></button>
            <div className="sv-modal__ico"><IconTrash /></div>
            <h3 className="sv-modal__title">{st.del.title}</h3>
            <p className="sv-modal__sub">{deleting.title}</p>

            {deleting.projectId ? (
              <div className="sv-modal__opts">
                <button className="sv-optcard" disabled={busy} onClick={() => doDelete('session')}>
                  <span className="sv-optcard__t">{st.del.sessionOnly}</span>
                  <span className="sv-optcard__h">{st.del.sessionOnlyHint}</span>
                </button>
                <button className="sv-optcard sv-optcard--danger" disabled={busy} onClick={() => doDelete('project')}>
                  <span className="sv-optcard__t">{st.del.projectToo}</span>
                  <span className="sv-optcard__h">{st.del.projectTooHint}</span>
                </button>
              </div>
            ) : (
              <>
                <p className="sv-modal__hint">{st.del.plainHint}</p>
                <div className="sv-modal__row">
                  <button className="sv-btn sv-btn--ghost" disabled={busy} onClick={() => setDeleting(null)}>{st.del.cancel}</button>
                  <button className="sv-btn sv-btn--danger" disabled={busy} onClick={() => doDelete('session')}>
                    <IconTrash /> {busy ? st.del.deleting : st.del.confirm}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </aside>
  );
}
