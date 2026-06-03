import { Container } from "@/components/container"
import { Icon } from "@/components/icon"
import { prisma } from "@/lib/prisma"
import { MetadataSeo } from "@/lib/metadata"
import { isValidLocale, type Locale } from "@/lib/i18n"
import { notFound } from "next/navigation"
import Link from "next/link"
import s from "../../roast.module.scss"

type Category = "hero" | "cta" | "copy" | "trust" | "design" | "mobile" | "seo" | "performance"
interface Problem {
  title: string
  detail: string
  severity: "high" | "medium" | "low"
  category?: Category
  impact?: string
  recommendation?: string
}
interface Teaser {
  score: number
  breakdown: Record<string, number>
  verdict?: string
  problems: Problem[]
  wins?: string[]
  screenshotUrl: string
  finalUrl: string
  title: string | null
}

const BREAKDOWN_LABELS: Record<string, string> = {
  clarity: "Clarity", design: "Design", conversion: "Conversion", mobile: "Mobile", trust: "Trust",
}
const CAT_LABEL: Record<string, { label: string; icon: string }> = {
  hero: { label: "Hero", icon: "hugeicons:layout-top" },
  cta: { label: "Call to action", icon: "hugeicons:cursor-magic-selection-03" },
  copy: { label: "Copy", icon: "hugeicons:text-align-left" },
  trust: { label: "Trust", icon: "hugeicons:shield-01" },
  design: { label: "Design", icon: "hugeicons:paint-board" },
  mobile: { label: "Mobile", icon: "hugeicons:smart-phone-01" },
  seo: { label: "SEO", icon: "hugeicons:search-01" },
  performance: { label: "Performance", icon: "hugeicons:dashboard-speed-02" },
}
function scoreColor(n: number) { return n >= 75 ? "#16a34a" : n >= 50 ? "#d97706" : "#dc2626" }
function fallbackVerdict(n: number) {
  if (n >= 80) return "Strong — but there's still upside."
  if (n >= 60) return "Decent, with real leaks to plug."
  if (n >= 40) return "Leaking customers. Worth a rebuild."
  return "Costing conversions every day."
}

async function load(shareId: string) {
  const m = await prisma.magnetSession.findUnique({
    where: { shareId },
    select: { teaser: true, input: true },
  })
  if (!m?.teaser) return null
  return { teaser: m.teaser as unknown as Teaser, input: m.input as { url?: string } }
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; shareId: string }> }) {
  const { locale: raw, shareId } = await params
  const locale = isValidLocale(raw) ? (raw as Locale) : "en"
  const data = await load(shareId)
  const score = data?.teaser?.score
  const host = (() => { try { return new URL(data?.teaser?.finalUrl || "").hostname } catch { return "this site" } })()
  return MetadataSeo({
    fullTitle: score != null ? `${host} scored ${score}/100 — roasted by Kalit` : "Landing page roast — Kalit",
    description: "See the conversion score, the issues costing customers, and rebuild it live with Kalit.",
    locale,
    pathname: `/roast-landing/r/${shareId}`,
    image: `/api/magnet/og/${shareId}`,
  })
}

export default async function SharedRoastPage({ params }: { params: Promise<{ shareId: string }> }) {
  const { shareId } = await params
  const data = await load(shareId)
  if (!data) notFound()
  const t = data.teaser

  return (
    <Container>
      <section className={s.page}>
        <div className={s.result}>
          <div className={s.resultHead}>
            <div className={s.scoreCard} style={{ ["--c" as string]: scoreColor(t.score) }}>
              <div className={s.scoreNum}>{t.score}</div>
              <div className={s.scoreOf}>/ 100</div>
            </div>
            <div className={s.resultHeadText}>
              <span className={s.resultUrl}>{t.finalUrl}</span>
              <h1 className={s.verdict}>{t.verdict || fallbackVerdict(t.score)}</h1>
              <div className={s.bars}>
                {Object.entries(t.breakdown || {}).map(([k, v]) => (
                  <div key={k} className={s.bar}>
                    <span className={s.barLabel}>{BREAKDOWN_LABELS[k] || k}</span>
                    <span className={s.barTrack}>
                      <span className={s.barFill} style={{ width: `${v}%`, background: scoreColor(v) }} />
                    </span>
                    <span className={s.barVal}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className={s.resultBody}>
            <div className={s.shotCol}>
              <div className={s.shotWrap}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className={s.shot} src={t.screenshotUrl} alt="Landing page" loading="lazy" />
              </div>
              {(t.wins?.length ?? 0) > 0 && (
                <div className={s.wins}>
                  <h3 className={s.winsTitle}><Icon icon="hugeicons:checkmark-badge-03" /> What&apos;s working</h3>
                  <ul>{t.wins!.map((w, i) => <li key={i}><Icon icon="hugeicons:tick-02" />{w}</li>)}</ul>
                </div>
              )}
            </div>

            <div className={s.findings}>
              <h2 className={s.findingsTitle}>{(t.problems || []).length} issues costing customers</h2>
              {(t.problems || []).map((p, i) => {
                const cat = CAT_LABEL[p.category || "design"] || CAT_LABEL.design
                return (
                  <div key={i} className={s.finding} data-sev={p.severity}>
                    <div className={s.findingTop}>
                      <span className={s.findingIcon}><Icon icon={cat.icon} /></span>
                      <div className={s.findingHead}>
                        <div className={s.findingTitle}>{p.title}</div>
                        <div className={s.findingMeta}>
                          <span className={s.catTag}>{cat.label}</span>
                          <span className={s.sevTag} data-sev={p.severity}>{p.severity}</span>
                        </div>
                      </div>
                    </div>
                    <p className={s.findingDetail}>{p.detail}</p>
                    {p.impact && <p className={s.findingLine}><span className={s.findingLabel}>Why it costs you</span>{p.impact}</p>}
                    {p.recommendation && <p className={s.findingLine} data-fix><span className={s.findingLabel}>The fix</span>{p.recommendation}</p>}
                  </div>
                )
              })}
            </div>
          </div>

          <div className={s.cta}>
            <div className={s.ctaText}>
              <h3>Want yours roasted — then rebuilt?</h3>
              <p>Get an in-depth conversion audit of your own landing page, then watch Kalit rebuild it live. Free.</p>
            </div>
            <div className={s.ctaActions}>
              <Link href="/roast-landing" className={s.linkBtn} style={{ fontWeight: 700 }}>
                Roast my landing page →
              </Link>
            </div>
          </div>
        </div>
      </section>
    </Container>
  )
}
