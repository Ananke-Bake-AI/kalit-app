import { useStrings } from '../lib/i18n';
import { IconClose } from '../lib/icons';
import type { PublishResult } from '../broker/useBrokerStudio';

interface Props {
  publishing: boolean;
  result: PublishResult | null;
  onClose: () => void;
  onRetry: () => void;
}

const mb = (b?: number) => (b ? Math.max(1, Math.round(b / 1e6)) : 0);

// Publish modal: opens on the Publish click and shows the outcome — a spinner
// while deploying, then success (with the live URL), the explicit size error
// when the site is over Vercel's 10 MB limit, or a generic failure with retry.
export function PublishModal({ publishing, result, onClose, onRetry }: Props) {
  const st = useStrings();
  return (
    <div className="sv-modal" onClick={onClose}>
      <div className="sv-modal__panel" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <button className="sv-modal__x" onClick={onClose} aria-label={st.pub.close}><IconClose /></button>

        {publishing ? (
          <>
            <h3 className="sv-modal__title"><span className="sv-btn__spin" /> {st.pub.publishing}</h3>
            <p className="sv-modal__sub">{st.pub.publishingSub}</p>
          </>
        ) : result?.phase === 'ok' ? (
          <>
            <h3 className="sv-modal__title">{st.pub.okTitle}</h3>
            <p className="sv-modal__sub">{st.pub.okSub}</p>
            <div className="sv-modal__row">
              {result.url && <a className="sv-btn sv-btn--primary" href={result.url} target="_blank" rel="noreferrer">{st.pub.visit}</a>}
              <button className="sv-btn sv-btn--ghost" onClick={onClose}>{st.pub.close}</button>
            </div>
          </>
        ) : result?.phase === 'too_large' ? (
          <>
            <h3 className="sv-modal__title">{st.pub.tooLargeTitle}</h3>
            <p className="sv-modal__sub">
              {st.pub.tooLargeSub.replace('{size}', String(mb(result.sizeBytes))).replace('{limit}', String(mb(result.limitBytes) || 10))}
            </p>
            <div className="sv-modal__row"><button className="sv-btn sv-btn--ghost" onClick={onClose}>{st.pub.close}</button></div>
          </>
        ) : (
          <>
            <h3 className="sv-modal__title">{st.pub.errTitle}</h3>
            <p className="sv-modal__sub">{st.pub.errSub}</p>
            <div className="sv-modal__row">
              <button className="sv-btn sv-btn--primary" onClick={onRetry}>{st.pub.retry}</button>
              <button className="sv-btn sv-btn--ghost" onClick={onClose}>{st.pub.close}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
