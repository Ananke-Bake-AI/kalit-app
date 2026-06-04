"use client"

import { Button } from "@/components/button"
import { Icon } from "@/components/icon"
import type { IdeaFull, IdeaPreview } from "@/lib/magnet/idea-types"
import Link from "next/link"
import s from "./idea.module.scss"

function host(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "")
  } catch {
    return url
  }
}

/**
 * The full idea one-pager. Free sections (fit, why-now, audience) always show;
 * the actionable depth (business model, GTM, competition, MVP) is gated until
 * `unlocked`. Shared by the funnel and the public share page so the brief looks
 * identical everywhere.
 */
export function BriefView({
  idea,
  unlocked,
  onUnlock,
  onBuild,
  unlocking = false,
  building = false,
}: {
  idea: IdeaFull | IdeaPreview
  unlocked: boolean
  onUnlock: () => void
  onBuild?: () => void
  unlocking?: boolean
  building?: boolean
}) {
  const full = unlocked ? (idea as IdeaFull) : null
  const op = idea.scores.opportunity

  return (
    <div className={s.brief}>
      <div className={s.briefHead}>
        <div className={s.briefRing} style={{ ["--c" as string]: op >= 75 ? "#16a34a" : op >= 50 ? "#d97706" : "var(--color-4)" }}>
          <span className={s.briefRingNum}>{op}</span>
          <span className={s.briefRingLbl}>opportunity</span>
        </div>
        <div className={s.briefHeadText}>
          <div className={s.briefName}>{idea.name}</div>
          {idea.tagline && <div className={s.briefTagline}>{idea.tagline}</div>}
          <div className={s.briefBadges}>
            <span className={s.cat}>{idea.category}</span>
            <span className={s.cat}>Kalit fit {idea.scores.kalitFit}</span>
            <span className={s.cat}>Market {idea.scores.market}</span>
            <span className={s.cat}>Signal {idea.scores.signal}</span>
            {idea.timeToMVP && <span className={s.cat}>{idea.timeToMVP}</span>}
          </div>
        </div>
      </div>

      {/* ── Free: why you, why now ── */}
      <div className={s.section}>
        <div className={s.sectionTitle}><Icon icon="hugeicons:target-02" /> Why this fits you</div>
        <p className={s.prose}>{idea.fitReason}</p>
      </div>

      <div className={s.kvGrid}>
        {idea.whyNow && (
          <div className={s.kv}>
            <span className={s.kvLabel}>Why now</span>
            <span className={s.kvVal}>{idea.whyNow}</span>
          </div>
        )}
        {idea.targetAudience && (
          <div className={s.kv}>
            <span className={s.kvLabel}>Who it&apos;s for</span>
            <span className={s.kvVal}>{idea.targetAudience}</span>
          </div>
        )}
      </div>

      {/* ── Gated: the playbook ── */}
      {full ? (
        <>
          {(full.businessModel.summary || full.businessModel.revenueModel) && (
            <div className={s.section}>
              <div className={s.sectionTitle}><Icon icon="hugeicons:money-bag-02" /> Business model</div>
              {full.businessModel.summary && <p className={s.prose}>{full.businessModel.summary}</p>}
              <div className={s.kvGrid}>
                {full.businessModel.revenueModel && (
                  <div className={s.kv}><span className={s.kvLabel}>Revenue model</span><span className={s.kvVal}>{full.businessModel.revenueModel}</span></div>
                )}
                {full.businessModel.pricing && (
                  <div className={s.kv}><span className={s.kvLabel}>Pricing</span><span className={s.kvVal}>{full.businessModel.pricing}</span></div>
                )}
                {full.businessModel.estimatedMRR && (
                  <div className={s.kv}><span className={s.kvLabel}>MRR potential</span><span className={s.kvVal}>{full.businessModel.estimatedMRR}</span></div>
                )}
                {full.marketSize && (
                  <div className={s.kv}><span className={s.kvLabel}>Market size</span><span className={s.kvVal}>{full.marketSize}</span></div>
                )}
              </div>
            </div>
          )}

          {full.gtm.length > 0 && (
            <div className={s.section}>
              <div className={s.sectionTitle}><Icon icon="hugeicons:rocket-01" /> How to launch it</div>
              <div className={s.gtm}>
                {full.gtm.map((step, i) => (
                  <div key={i} className={s.gtmStep}>{step}</div>
                ))}
              </div>
            </div>
          )}

          {full.uniqueAngle && (
            <div className={s.section}>
              <div className={s.sectionTitle}><Icon icon="hugeicons:idea-01" /> The wedge</div>
              <p className={s.prose}>{full.uniqueAngle}</p>
            </div>
          )}

          {full.competitors.length > 0 && (
            <div className={s.section}>
              <div className={s.sectionTitle}><Icon icon="hugeicons:chart-relationship" /> Who you&apos;re up against</div>
              <div className={s.compChips}>
                {full.competitors.map((c, i) => <span key={i} className={s.compChip}>{c}</span>)}
              </div>
            </div>
          )}

          {(full.mvp.pages.length > 0 || full.mvp.keyFlows.length > 0) && (
            <div className={s.section}>
              <div className={s.sectionTitle}><Icon icon="hugeicons:blueprint-01" /> What the MVP looks like</div>
              {full.mvp.launchScope && <p className={s.prose}>{full.mvp.launchScope}</p>}
              <div className={s.mvpCols}>
                {full.mvp.pages.length > 0 && (
                  <div>
                    <span className={s.kvLabel}>Pages</span>
                    <ul className={s.mvpList}>{full.mvp.pages.map((p, i) => <li key={i}><Icon icon="hugeicons:tick-02" />{p}</li>)}</ul>
                  </div>
                )}
                {full.mvp.keyFlows.length > 0 && (
                  <div>
                    <span className={s.kvLabel}>Key flows</span>
                    <ul className={s.mvpList}>{full.mvp.keyFlows.map((p, i) => <li key={i}><Icon icon="hugeicons:tick-02" />{p}</li>)}</ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {full.sourceUrls.length > 0 && (
            <div className={s.section}>
              <div className={s.sectionTitle}><Icon icon="hugeicons:link-02" /> The demand signals behind it</div>
              <div className={s.sources}>
                {full.sourceUrls.map((u, i) => (
                  <a key={i} className={s.source} href={u} target="_blank" rel="noopener noreferrer">
                    <Icon icon="hugeicons:arrow-up-right-01" />{host(u)}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* ── Upsell into Flow / Pentest / Search ── */}
          <div className={s.upsell}>
            <div className={s.upsellHead}>
              <h3>Stop reading. Ship a demo of {idea.name}.</h3>
              <p>
                Watch Kalit Flow build a live demo landing page for this idea, real copy in your brand, so you can put
                it in front of people and test demand this week. Then keep digging: probe a competitor&apos;s security
                with Kalit Pentest, or let Kalit Search drop fresh ideas like this in your lap every day.
              </p>
            </div>
            <div className={s.upsellActions}>
              {onBuild && (
                <Button icon="hugeicons:rocket-01" onClick={onBuild} disabled={building}>
                  {building ? "Opening Flow…" : "Build a demo in Flow"}
                </Button>
              )}
              <a className={s.linkBtn} href={idea.searchUrl} target="_blank" rel="noopener noreferrer">
                <Icon icon="hugeicons:search-01" /> Open full data on Kalit Search
              </a>
              <Link className={s.linkBtn} href="/pentest">
                <Icon icon="hugeicons:shield-01" /> Pressure-test the market with Pentest
              </Link>
            </div>
          </div>
        </>
      ) : (
        <div className={s.locked}>
          <div className={s.lockedInner} aria-hidden>
            <div className={s.section}>
              <div className={s.sectionTitle}><Icon icon="hugeicons:money-bag-02" /> Business model</div>
              <p className={s.prose}>Revenue model, pricing, MRR potential and market size, grounded in Kalit Search data.</p>
            </div>
            <div className={s.section}>
              <div className={s.sectionTitle}><Icon icon="hugeicons:rocket-01" /> How to launch it</div>
              <div className={s.gtm}>
                <div className={s.gtmStep}>The first channel to win and how to seed it.</div>
                <div className={s.gtmStep}>How to land the first ten customers.</div>
                <div className={s.gtmStep}>The wedge that compounds into a moat.</div>
              </div>
            </div>
          </div>
          <div className={s.lockOverlay}>
            <div className={s.lockIcon}><Icon icon="hugeicons:square-lock-02" /></div>
            <div className={s.lockTitle}>Unlock the full brief, free</div>
            <p className={s.lockText}>
              The business model, the step by step launch playbook, the competition, and the MVP scope. Make a free
              account to reveal it and see how Kalit helps you actually build it.
            </p>
            <Button icon="hugeicons:arrow-right-02" onClick={onUnlock} disabled={unlocking}>
              {unlocking ? "Unlocking…" : "Unlock the full brief"}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
