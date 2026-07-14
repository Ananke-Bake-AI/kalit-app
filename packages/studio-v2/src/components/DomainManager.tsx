import { useState } from 'react';
import { useStrings } from '../lib/i18n';
import { IconClose } from '../lib/icons';
import type { DomainState } from '../broker/useBrokerStudio';

interface Props {
  domain: DomainState;
  onConnect: (domain: string) => Promise<{ ok: boolean; error?: string }>;
  onRemove: () => void;
  onClose: () => void;
}

// Custom-domain manager modal. Two states: no domain → input + connect; a
// connected domain → status badge + the DNS records to set + remove. While
// pending, the hook polls the broker (which re-checks Vercel) and flips the
// status to active once DNS verifies.
export function DomainManager({ domain, onConnect, onRemove, onClose }: Props) {
  const st = useStrings();
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const connected = !!domain.customDomain;

  const submit = async () => {
    const d = input.trim().toLowerCase();
    if (!d || busy) return;
    setBusy(true); setErr('');
    const r = await onConnect(d);
    setBusy(false);
    if (!r.ok) setErr(r.error || st.domain.error);
  };

  return (
    <div className="sv-modal" onClick={onClose}>
      <div className="sv-modal__panel" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <button className="sv-modal__x" onClick={onClose} aria-label={st.del.cancel}><IconClose /></button>
        <h3 className="sv-modal__title">{st.domain.title}</h3>

        {!connected ? (
          <>
            <p className="sv-modal__sub">{st.domain.sub}</p>
            <input
              className="sv-domain__input"
              value={input}
              autoFocus
              placeholder={st.domain.placeholder}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
            />
            {err && <div className="sv-err">{err}</div>}
            <div className="sv-modal__row">
              <button className="sv-btn sv-btn--primary" disabled={busy || !input.trim()} onClick={submit}>
                {busy && <span className="sv-btn__spin" />}{busy ? st.domain.connecting : st.domain.connect}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="sv-domain__status">
              <strong>{domain.customDomain}</strong>
              <span className={'sv-domain__badge sv-domain__badge--' + (domain.status === 'active' ? 'ok' : 'pending')}>
                {domain.status === 'active' ? st.domain.active : st.domain.pending}
              </span>
            </div>
            {domain.dnsRecords && domain.dnsRecords.length > 0 ? (
              <>
                <p className="sv-modal__sub">{st.domain.dnsHint}</p>
                <div className="sv-domain__dns">
                  {domain.dnsRecords.map((r, i) => (
                    <div key={i} className="sv-domain__rec">
                      <span className="sv-domain__type">{r.type}</span>
                      <span className="sv-domain__name">{r.name}</span>
                      <span className="sv-domain__val">{r.value}</span>
                    </div>
                  ))}
                </div>
                <p className="sv-domain__cf">⚠️ {st.domain.cloudflareHint}</p>
              </>
            ) : domain.status === 'pending' ? (
              <p className="sv-modal__sub">{st.domain.verifying}</p>
            ) : null}
            <div className="sv-modal__row">
              <a className="sv-btn sv-btn--ghost" href={`https://${domain.customDomain}`} target="_blank" rel="noreferrer">{st.domain.visit}</a>
              <button className="sv-btn sv-btn--ghost" onClick={onRemove}>{st.domain.remove}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
