import { useMemo, useState } from 'react';
import type { Session } from '../lib/types';
import { IconLogo, IconPlus, IconSearch, IconDots, IconTrash, IconClose } from '../lib/icons';
import { useStrings } from '../lib/i18n';

interface Props {
  sessions: Session[];
  activeId: string | null;
  user: { name: string; credits?: number };
  storage?: { usedBytes: number; limitBytes: number } | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string, mode: 'session' | 'project') => void;
}

// Compact byte formatter for the storage gauge (e.g. "44 MB", "1.2 GB").
function fmtBytes(n: number): string {
  if (n >= 1 << 30) return (n / (1 << 30)).toFixed(n < 10 << 30 ? 1 : 0) + ' GB';
  if (n >= 1 << 20) return Math.round(n / (1 << 20)) + ' MB';
  if (n >= 1 << 10) return Math.round(n / (1 << 10)) + ' KB';
  return n + ' B';
}

const IconPin = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 17v5" /><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z" />
  </svg>
);
const IconPinOff = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 17v5" /><path d="M15 9.34V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H7.89" /><path d="m2 2 20 20" /><path d="M9 9v1.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h11" />
  </svg>
);

// Sessions épinglées : stockées en localStorage (préférence par navigateur).
const PIN_KEY = 'kalit.studio.pinned';
function loadPinned(): Set<string> {
  try { const s = localStorage.getItem(PIN_KEY); if (s) return new Set(JSON.parse(s) as string[]); } catch { /* ignore */ }
  return new Set();
}

export function Sidebar({ sessions, activeId, user, storage, onSelect, onNew, onDelete }: Props) {
  const st = useStrings();
  const [q, setQ] = useState('');
  const [deleting, setDeleting] = useState<Session | null>(null);
  const [busy, setBusy] = useState(false);
  const [pinned, setPinned] = useState<Set<string>>(() => (typeof window !== 'undefined' ? loadPinned() : new Set()));
  const togglePin = (id: string) => setPinned((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    try { localStorage.setItem(PIN_KEY, JSON.stringify([...next])); } catch { /* ignore */ }
    return next;
  });
  const filtered = useMemo(
    () => sessions.filter((s) => s.title.toLowerCase().includes(q.toLowerCase())).sort((a, b) => b.updatedAt - a.updatedAt),
    [sessions, q],
  );
  const pinnedList = useMemo(() => filtered.filter((s) => pinned.has(s.id)), [filtered, pinned]);
  const recentList = useMemo(() => filtered.filter((s) => !pinned.has(s.id)), [filtered, pinned]);

  const doDelete = (mode: 'session' | 'project') => {
    if (!deleting) return;
    setBusy(true);
    onDelete(deleting.id, mode);
    // La suppression est optimiste côté hook ; on ferme aussitôt.
    setBusy(false);
    setDeleting(null);
  };

  const renderSession = (s: Session) => {
    const isPinned = pinned.has(s.id);
    return (
      <div key={s.id} className={'sv-sess' + (s.id === activeId ? ' sv-sess--active' : '')} onClick={() => onSelect(s.id)}>
        <div className="sv-sess__title">
          {s.status === 'running' && <span className="sv-dot sv-dot--run sv-sess__run" title={st.running} />}
          <span className="sv-sess__name">{s.title}</span>
        </div>
        <button
          className={'sv-sess__pin' + (isPinned ? ' sv-sess__pin--on' : '')}
          title={isPinned ? st.unpin : st.pin}
          aria-label={isPinned ? st.unpin : st.pin}
          onClick={(e) => { e.stopPropagation(); togglePin(s.id); }}
        >
          {isPinned ? <IconPinOff /> : <IconPin />}
        </button>
        <button
          className="sv-sess__more"
          title={st.del.confirm}
          aria-label={st.del.confirm}
          onClick={(e) => { e.stopPropagation(); setDeleting(s); }}
        >
          <IconDots />
        </button>
      </div>
    );
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
        {pinnedList.length > 0 && (
          <>
            <div className="sv-side__group">{st.pinned}</div>
            {pinnedList.map(renderSession)}
          </>
        )}
        {recentList.length > 0 && (
          <>
            <div className="sv-side__group">{st.recents}</div>
            {recentList.map(renderSession)}
          </>
        )}
      </div>
      {storage && storage.limitBytes > 0 && (() => {
        const pct = Math.min(100, Math.round((storage.usedBytes / storage.limitBytes) * 100));
        const warn = pct >= 80;
        return (
          <div className={'sv-storage' + (warn ? ' sv-storage--warn' : '')}>
            <div className="sv-storage__head">
              <span>{st.storage.label}</span>
              <span className="sv-storage__num">{fmtBytes(storage.usedBytes)} / {fmtBytes(storage.limitBytes)}</span>
            </div>
            <div className="sv-storage__bar"><span style={{ width: pct + '%' }} /></div>
            {warn && <div className="sv-storage__warn">{st.storage.almostFull}</div>}
          </div>
        );
      })()}
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
