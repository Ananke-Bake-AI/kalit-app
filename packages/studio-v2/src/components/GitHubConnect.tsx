import { useEffect, useState, useCallback } from 'react';
import { useStrings } from '../lib/i18n';
import { IconClose } from '../lib/icons';
import type { GithubApi, GithubInstallation, GithubRepo, GithubLink } from '../broker/useBrokerStudio';

interface Props {
  github: GithubApi;
  onClose: () => void;
}

// Dialog « Connecter GitHub » : lie un repo de l'utilisateur au projet. Le broker
// clone le repo au tour suivant et l'agent peut livrer via une pull request. Le
// token GitHub reste 100% côté broker — ici on ne choisit qu'un repo.
export function GitHubConnect({ github, onClose }: Props) {
  const st = useStrings();
  const g = st.github;
  const [phase, setPhase] = useState<'loading' | 'connected' | 'need-app' | 'pick'>('loading');
  const [link, setLink] = useState<GithubLink | null>(null);
  const [installs, setInstalls] = useState<GithubInstallation[]>([]);
  const [installId, setInstallId] = useState<string>('');
  const [repos, setRepos] = useState<GithubRepo[]>([]);
  const [reposLoading, setReposLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [filter, setFilter] = useState('');

  const load = useCallback(async () => {
    setErr('');
    const status = await github.status();
    if (status?.connected) { setLink(status); setPhase('connected'); return; }
    const inst = await github.installations();
    if (!inst.configured) { setErr(g.notConfigured); setPhase('need-app'); return; }
    if (inst.installations.length === 0) { setPhase('need-app'); return; }
    setInstalls(inst.installations);
    const first = inst.installations[0].installationId;
    setInstallId(first);
    setPhase('pick');
  }, [github, g.notConfigured]);

  useEffect(() => { load(); }, [load]);

  // Charge les repos de l'installation sélectionnée.
  useEffect(() => {
    if (phase !== 'pick' || !installId) return;
    let alive = true;
    setReposLoading(true); setRepos([]);
    github.repos(installId).then((r) => { if (alive) setRepos(r); }).finally(() => { if (alive) setReposLoading(false); });
    return () => { alive = false; };
  }, [phase, installId, github]);

  // Popup d'installation de l'App ; on recharge quand elle signale la fin.
  const openInstall = () => {
    const w = window.open(github.installUrl, 'kalit-gh-install', 'width=1024,height=760');
    const onMsg = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      if (e.data?.type === 'kalit:github-installed') { window.removeEventListener('message', onMsg); setPhase('loading'); load(); }
    };
    window.addEventListener('message', onMsg);
    // Filet si le popup est fermé sans message (install directe) : on recharge au focus.
    const iv = setInterval(() => { if (w && w.closed) { clearInterval(iv); window.removeEventListener('message', onMsg); setPhase('loading'); load(); } }, 1200);
  };

  const connect = async (repo: GithubRepo) => {
    if (busy) return;
    setBusy(true); setErr('');
    const ok = await github.connect({ repoFullName: repo.fullName, defaultBranch: repo.defaultBranch, installationId: installId });
    setBusy(false);
    if (!ok) { setErr(g.connectFailed); return; }
    setLink({ connected: true, repoFullName: repo.fullName, defaultBranch: repo.defaultBranch });
    setPhase('connected');
  };

  const disconnect = async () => {
    if (busy) return;
    setBusy(true);
    const ok = await github.disconnect();
    setBusy(false);
    if (ok) { setLink(null); setPhase('loading'); load(); }
  };

  const shown = repos.filter((r) => !filter.trim() || r.fullName.toLowerCase().includes(filter.trim().toLowerCase()));

  return (
    <div className="sv-modal" onClick={onClose}>
      <div className="sv-modal__panel" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <button className="sv-modal__x" onClick={onClose} aria-label={st.invite.close}><IconClose /></button>
        <h3 className="sv-modal__title">{g.title}</h3>
        <p className="sv-modal__sub">{g.sub}</p>

        {err && <div className="sv-err">{err}</div>}

        {phase === 'loading' && <div className="sv-gh__empty">{g.loading}</div>}

        {phase === 'connected' && link && (
          <div className="sv-gh__connected">
            <div className="sv-gh__repo-row">
              <span className="sv-gh__dot" />
              <div className="sv-gh__repo-main">
                <span className="sv-gh__repo-name">{link.repoFullName}</span>
                <span className="sv-gh__repo-hint">{g.connectedHint.replace('{branch}', link.defaultBranch || 'main')}</span>
              </div>
            </div>
            <div className="sv-modal__row">
              <button className="sv-btn sv-btn--ghost" disabled={busy} onClick={disconnect}>{busy ? '…' : g.disconnect}</button>
            </div>
          </div>
        )}

        {phase === 'need-app' && (
          <div className="sv-gh__needapp">
            <p className="sv-modal__sub">{g.needApp}</p>
            <div className="sv-modal__row">
              <button className="sv-btn sv-btn--primary" onClick={openInstall}>{g.installApp}</button>
            </div>
          </div>
        )}

        {phase === 'pick' && (
          <div className="sv-gh__pick">
            {installs.length > 1 && (
              <label className="sv-invite__field">
                <span className="sv-invite__label">{g.account}</span>
                <select className="sv-domain__input" value={installId} onChange={(e) => setInstallId(e.target.value)}>
                  {installs.map((i) => <option key={i.installationId} value={i.installationId}>{i.accountLogin}</option>)}
                </select>
              </label>
            )}
            <input className="sv-domain__input" placeholder={g.searchRepo} value={filter} onChange={(e) => setFilter(e.target.value)} />
            <div className="sv-gh__list">
              {reposLoading ? (
                <div className="sv-gh__empty">{g.loadingRepos}</div>
              ) : shown.length === 0 ? (
                <div className="sv-gh__empty">{g.noRepos}</div>
              ) : shown.map((r) => (
                <button key={r.fullName} type="button" className="sv-gh__item" disabled={busy} onClick={() => connect(r)}>
                  <span className="sv-gh__item-name">{r.fullName}</span>
                  {r.private && <span className="sv-gh__badge">{g.privateBadge}</span>}
                </button>
              ))}
            </div>
            <div className="sv-gh__foot">
              <button className="sv-btn sv-btn--ghost sv-btn--sm" onClick={openInstall}>{g.manageRepos}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
