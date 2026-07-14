import { useEffect, useState } from 'react';
import { useStrings } from '../lib/i18n';
import { IconClose, IconTrash } from '../lib/icons';
import type { ProjectInvite } from '../broker/useBrokerStudio';

interface Props {
  onCreate: (opts: { role: 'viewer' | 'editor'; email?: string }) => Promise<{ token: string; url: string } | null>;
  onList: () => Promise<ProjectInvite[]>;
  onRevoke: (token: string) => Promise<boolean>;
  onClose: () => void;
}

// Dialog « travailler à plusieurs » : crée un lien d'invitation (viewer/editor,
// optionnellement lié à un e-mail) qu'on envoie à un collaborateur ; celui-ci
// devient membre du même projet en l'ouvrant depuis son compte. Liste + révoque
// les invitations actives du projet.
export function ShareDialog({ onCreate, onList, onRevoke, onClose }: Props) {
  const st = useStrings();
  const [role, setRole] = useState<'viewer' | 'editor'>('viewer');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [link, setLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [invites, setInvites] = useState<ProjectInvite[]>([]);

  const refresh = () => { onList().then(setInvites).catch(() => {}); };
  useEffect(() => { refresh(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const create = async () => {
    if (busy) return;
    setBusy(true); setErr(''); setLink(''); setCopied(false);
    const r = await onCreate({ role, email: email.trim() || undefined });
    setBusy(false);
    if (!r?.url) { setErr(st.errors.generic); return; }
    setLink(r.url);
    setEmail('');
    refresh();
  };

  const copy = async () => {
    try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* ignore */ }
  };

  const revoke = async (token: string) => {
    if (await onRevoke(token)) setInvites((list) => list.filter((i) => i.token !== token));
  };

  return (
    <div className="sv-modal" onClick={onClose}>
      <div className="sv-modal__panel" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <button className="sv-modal__x" onClick={onClose} aria-label={st.invite.close}><IconClose /></button>
        <h3 className="sv-modal__title">{st.invite.title}</h3>
        <p className="sv-modal__sub">{st.invite.sub}</p>

        <div className="sv-invite__roles" role="radiogroup" aria-label={st.invite.roleLabel}>
          {(['viewer', 'editor'] as const).map((r) => (
            <button
              key={r}
              type="button"
              role="radio"
              aria-checked={role === r}
              className={'sv-invite__role' + (role === r ? ' sv-invite__role--on' : '')}
              onClick={() => setRole(r)}
            >
              <span className="sv-invite__role-name">{r === 'viewer' ? st.invite.viewer : st.invite.editor}</span>
              <span className="sv-invite__role-hint">{r === 'viewer' ? st.invite.viewerHint : st.invite.editorHint}</span>
            </button>
          ))}
        </div>

        <label className="sv-invite__field">
          <span className="sv-invite__label">{st.invite.emailLabel}</span>
          <input
            className="sv-domain__input"
            type="email"
            value={email}
            placeholder={st.invite.emailPlaceholder}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') create(); }}
          />
        </label>

        {err && <div className="sv-err">{err}</div>}

        {link && (
          <div className="sv-invite__ready">
            <p className="sv-modal__sub">{st.invite.linkReady}</p>
            <div className="sv-invite__linkrow">
              <input className="sv-domain__input sv-invite__link" readOnly value={link} onFocus={(e) => e.target.select()} />
              <button className="sv-btn sv-btn--ghost" onClick={copy}>{copied ? st.invite.copied : st.invite.copy}</button>
            </div>
          </div>
        )}

        <div className="sv-modal__row">
          <button className="sv-btn sv-btn--primary" disabled={busy} onClick={create}>
            {busy && <span className="sv-btn__spin" />}{busy ? st.invite.creating : st.invite.create}
          </button>
        </div>

        <div className="sv-invite__list">
          <div className="sv-invite__list-h">{st.invite.activeTitle}</div>
          {invites.length === 0 ? (
            <div className="sv-invite__empty">{st.invite.noInvites}</div>
          ) : invites.map((iv) => (
            <div key={iv.token} className="sv-invite__item">
              <div className="sv-invite__item-main">
                <span className={'sv-invite__tag sv-invite__tag--' + iv.role}>{iv.role === 'editor' ? st.invite.editor : st.invite.viewer}</span>
                <span className="sv-invite__who">{iv.email ? `${st.invite.boundTo} ${iv.email}` : st.invite.anyoneCan}</span>
                <span className="sv-invite__uses">{iv.uses}/{iv.maxUses}</span>
              </div>
              <button className="sv-btn sv-btn--ghost sv-btn--icon" title={st.invite.revoke} aria-label={st.invite.revoke} onClick={() => revoke(iv.token)}><IconTrash /></button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
