import { Container } from "@/components/container"
import { prisma } from "@/lib/prisma"
import { MetadataSeo } from "@/lib/metadata"
import { isValidLocale, type Locale } from "@/lib/i18n"
import { notFound } from "next/navigation"
import Link from "next/link"
import s from "../../roast.module.scss"

interface Problem { title: string; detail: string; severity: "high" | "medium" | "low" }
interface Teaser {
  score: number
  breakdown: Record<string, number>
  problems: Problem[]
  screenshotUrl: string
  finalUrl: string
  title: string | null
}

const BREAKDOWN_LABELS: Record<string, string> = {
  clarity: "Clarity", design: "Design", conversion: "Conversion", mobile: "Mobile", trust: "Trust",
}
function scoreColor(n: number) { return n >= 75 ? "#16a34a" : n >= 50 ? "#d97706" : "#dc2626" }
function verdict(n: number) {
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
    description: "See the conversion score, the 3 biggest problems, and rebuild it live with Kalit.",
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
              <h1 className={s.verdict}>{verdict(t.score)}</h1>
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
            <div className={s.shotWrap}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className={s.shot} src={t.screenshotUrl} alt="Landing page" loading="lazy" />
            </div>
            <div className={s.problems}>
              <h2 className={s.problemsTitle}>The 3 biggest problems</h2>
              {(t.problems || []).map((p, i) => (
                <div key={i} className={s.problem} data-sev={p.severity}>
                  <span className={s.problemNum}>{i + 1}</span>
                  <div>
                    <div className={s.problemTitle}>
                      {p.title}
                      <span className={s.sevTag} data-sev={p.severity}>{p.severity}</span>
                    </div>
                    <p className={s.problemDetail}>{p.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={s.cta}>
            <div className={s.ctaText}>
              <h3>Want yours roasted — then rebuilt?</h3>
              <p>Get an instant score on your own landing page, then watch Kalit rebuild it live. Free.</p>
            </div>
            <div className={s.ctaActions}>
              <Link href="/roast-landing" className={s.shareBtn} style={{ fontWeight: 700 }}>
                Roast my landing page →
              </Link>
            </div>
          </div>
        </div>
      </section>
    </Container>
  )
}
