import { useEffect, useRef, useState } from 'react';
import { useStrings } from '../lib/i18n';
import { IconLogo } from '../lib/icons';
import type { ActivityStep, ActivityKind } from '../lib/activity';

// ── Silhouette « site fantôme » : faux navigateur + wireframe qui s'allume ──
// Pendant un build sans site encore servable, les blocs passent d'éteints à
// « allumés » au fil des fichiers écrits — le site se matérialise.
function GhostSite({ lit }: { lit: number }) {
  // lit = nombre de blocs à allumer (nav, hero, 3 cards → 0..5)
  const on = (i: number) => (i < lit ? ' sv-ghost__blk--lit' : '');
  return (
    <div className="sv-ghost">
      <div className="sv-ghost__chrome"><i /><i /><i /><span className="sv-ghost__url">preview</span></div>
      <div className="sv-ghost__wire">
        <div className={'sv-ghost__blk sv-ghost__nav' + on(0)}>
          <span className="sv-ghost__logo" /><span className="sv-ghost__links"><span /><span /><span /></span>
        </div>
        <div className={'sv-ghost__blk sv-ghost__hero' + on(1)} />
        <div className="sv-ghost__cards">
          <div className={'sv-ghost__blk sv-ghost__card' + on(2)} />
          <div className={'sv-ghost__blk sv-ghost__card' + on(3)} />
          <div className={'sv-ghost__blk sv-ghost__card' + on(4)} />
        </div>
      </div>
    </div>
  );
}

// Verbe i18n + libellé d'une étape d'activité.
function stepText(st: ActivityStep, t: ReturnType<typeof useStrings>): { verb: string; target?: string; detail?: string } {
  const a = t.act;
  const map: Record<ActivityKind, string> = {
    think: a.think, write: a.write, edit: a.edit, read: a.read, bash: a.bash, search: a.search,
    navigate: a.navigate, screenshot: a.screenshot, resize: a.resize, console: a.console, assets: a.assets, task: a.task, tool: a.tool,
  };
  return { verb: map[st.kind] || a.tool, target: st.target, detail: st.detail };
}

function ActivityRows({ steps, max = 4 }: { steps: ActivityStep[]; max?: number }) {
  const t = useStrings();
  const shown = steps.slice(-max);
  return (
    <div className="sv-feed__rows">
      {shown.map((s) => {
        const { verb, target, detail } = stepText(s, t);
        return (
          <div key={s.key} className={'sv-feed__row' + (s.status === 'running' ? ' sv-feed__row--now' : '')}>
            <span className="sv-feed__st">
              {s.status === 'running' ? <span className="sv-feed__dot" />
                : s.status === 'error' ? <span className="sv-feed__x">✕</span>
                : <span className="sv-feed__chk">✓</span>}
            </span>
            <span className="sv-feed__body">
              <span className="sv-feed__verb">{verb}</span>
              {target && <> <b>{target}</b></>}
              {detail && <span className="sv-feed__detail"> {detail}</span>}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// Astuce rotative (i18n), pause au survol, respecte prefers-reduced-motion.
function TipCard() {
  const t = useStrings();
  const tips = t.previewTips;
  const [i, setI] = useState(0);
  const paused = useRef(false);
  useEffect(() => {
    if (typeof window !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const iv = setInterval(() => { if (!paused.current) setI((x) => (x + 1) % tips.length); }, 5200);
    return () => clearInterval(iv);
  }, [tips.length]);
  if (!tips.length) return null;
  return (
    <div className="sv-tip" onMouseEnter={() => (paused.current = true)} onMouseLeave={() => (paused.current = false)}>
      <div className="sv-tip__lbl"><span>{t.preview2.tipLabel}</span>
        <span className="sv-tip__dots">{tips.slice(0, 6).map((_, k) => <i key={k} className={k === i % 6 ? 'on' : ''} />)}</span>
      </div>
      <div className="sv-tip__txt" key={i}>{tips[i]}</div>
    </div>
  );
}

// État BUILD (1ère génération, pas de site servable encore) : ghost + feed + rail.
export function BuildingView({ steps }: { steps: ActivityStep[] }) {
  const t = useStrings();
  const litCount = Math.min(5, steps.filter((s) => s.kind === 'write' || s.kind === 'edit').length);
  return (
    <div className="sv-prev__live">
      <div className="sv-welcome__glow" aria-hidden />
      <GhostSite lit={litCount} />
      <div className="sv-prev__livehd">
        <span className="sv-feed__dot" /> {t.preview2.buildingTitle}
      </div>
      <div className="sv-feed">
        <div className="sv-feed__h"><span>{t.preview2.activityLabel}</span></div>
        <ActivityRows steps={steps} />
      </div>
    </div>
  );
}

// État CONVERSATION terminée sans fichier : « pas encore de site » + CTA + tip.
export function NoSiteView({ onFocusChat }: { onFocusChat?: () => void }) {
  const t = useStrings();
  return (
    <div className="sv-prev__live">
      <div className="sv-welcome__glow" aria-hidden />
      <GhostSite lit={0} />
      <div className="sv-nosite">
        <div className="sv-nosite__badge">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 10h8M8 14h5M21 15a2 2 0 0 1-2 2H8l-4 4V5a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2Z" /></svg>
        </div>
        <h3 className="sv-nosite__title">{t.preview2.noSiteTitle}</h3>
        <p className="sv-nosite__sub">{t.preview2.noSiteSub}</p>
        {onFocusChat && (
          <button className="sv-btn sv-btn--primary" onClick={onFocusChat}>{t.preview2.describeCta}</button>
        )}
      </div>
      <TipCard />
    </div>
  );
}

// Bande d'activité DOCKÉE au-dessus de l'iframe (modification d'un site existant).
// Ne cache jamais le site : juste un liseré + la dernière action, ou un état à jour.
export function ActivityStrip({ steps, fileWrite }: { steps: ActivityStep[]; fileWrite: boolean }) {
  const t = useStrings();
  const last = steps[steps.length - 1];
  const label = fileWrite ? t.preview2.modifying : t.preview2.respondingChat;
  return (
    <div className="sv-strip">
      <span className="sv-strip__live"><span className="sv-feed__dot" /> {label}</span>
      {last && fileWrite && (() => {
        const { verb, target } = stepText(last, t);
        return <span className="sv-strip__last">{verb}{target ? <> <b>{target}</b></> : null}</span>;
      })()}
    </div>
  );
}

// Petit logo pour l'état welcome (réexport pratique).
export { IconLogo };
