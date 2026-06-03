"use client"

import { Button } from "@/components/button"
import { Container } from "@/components/container"
import { Icon } from "@/components/icon"
import { TextField } from "@/components/text-field"
import { magnetEvent } from "@/lib/magnet/events"
import { useSession } from "next-auth/react"
import { useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import s from "./roast.module.scss"

type Category = "hero" | "cta" | "copy" | "trust" | "design" | "mobile" | "seo" | "performance"
interface Problem {
  title: string
  detail: string
  severity: "high" | "medium" | "low"
  category: Category
  impact: string
  recommendation: string
}
interface Teaser {
  score: number
  breakdown: { clarity: number; design: number; conversion: number; mobile: number; trust: number }
  verdict: string
  problems: Problem[]
  wins: string[]
  screenshotUrl: string
  finalUrl: string
  title: string | null
  mode?: "text" | "vision"
}
interface RoastResult {
  magnetSessionId: string
  shareId: string
  input: { url: string }
  teaser: Teaser
}

const BREAKDOWN_LABELS: Record<string, string> = {
  clarity: "Clarity", design: "Design", conversion: "Conversion", mobile: "Mobile", trust: "Trust",
}
const CATEGORY: Record<Category, { label: string; icon: string }> = {
  hero: { label: "Hero", icon: "hugeicons:layout-top" },
  cta: { label: "Call to action", icon: "hugeicons:cursor-magic-selection-03" },
  copy: { label: "Copy", icon: "hugeicons:text-align-left" },
  trust: { label: "Trust", icon: "hugeicons:shield-01" },
  design: { label: "Design", icon: "hugeicons:paint-board" },
  mobile: { label: "Mobile", icon: "hugeicons:smart-phone-01" },
  seo: { label: "SEO", icon: "hugeicons:search-01" },
  performance: { label: "Performance", icon: "hugeicons:dashboard-speed-02" },
}
const LOADING_STEPS = [
  { icon: "hugeicons:download-04", label: "Fetching your page" },
  { icon: "hugeicons:camera-01", label: "Capturing a screenshot" },
  { icon: "hugeicons:ai-brain-03", label: "Analyzing conversion" },
  { icon: "hugeicons:chart-average", label: "Scoring & writing your audit" },
]

function scoreColor(n: number): string {
  if (n >= 75) return "#16a34a"
  if (n >= 50) return "#d97706"
  return "#dc2626"
}
function scoreVerdict(n: number): string {
  if (n >= 80) return "Strong — but there's still upside."
  if (n >= 60) return "Decent, with real leaks to plug."
  if (n >= 40) return "Leaking customers. Worth a rebuild."
  return "Costing you conversions every day."
}

// Screenshot with skeleton + auto-retry + graceful fallback. The proxy can
// 502 on a cold render (provider still rendering); it resolves within seconds,
// so we silently retry a couple times before showing the manual fallback.
function Screenshot({ url, alt }: { url: string; alt: string }) {
  const [state, setState] = useState<"loading" | "ok" | "error">("loading")
  const [bust, setBust] = useState(0)
  const tries = useRef(0)
  const src = bust ? `${url}${url.includes("?") ? "&" : "?"}r=${bust}` : url
  const onError = () => {
    if (tries.current < 2) {
      tries.current += 1
      setState("loading")
      setTimeout(() => setBust(Date.now()), 4000)
    } else {
      setState("error")
    }
  }
  const retry = () => { tries.current = 0; setState("loading"); setBust(Date.now()) }
  return (
    <div className={s.shotWrap}>
      {state !== "ok" && (
        <div className={s.shotState}>
          {state === "loading" ? (
            <>
              <span className={s.shotSpinner} />
              <span>Capturing preview…</span>
            </>
          ) : (
            <>
              <Icon icon="hugeicons:image-not-found-01" />
              <span>Preview unavailable</span>
              <button type="button" className={s.shotRetry} onClick={retry}>
                Retry
              </button>
            </>
          )}
        </div>
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className={s.shot}
        src={src}
        alt={alt}
        style={{ opacity: state === "ok" ? 1 : 0 }}
        onLoad={() => setState("ok")}
        onError={onError}
      />
    </div>
  )
}

export function RoastClient() {
  const { status } = useSession()
  const [url, setUrl] = useState("")
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<RoastResult | null>(null)

  useEffect(() => {
    magnetEvent("tool_viewed")
  }, [])

  // Advance the loading steps on a timer while the request is in flight.
  useEffect(() => {
    if (!loading) { setStep(0); return }
    const t = setInterval(() => setStep((p) => Math.min(p + 1, LOADING_STEPS.length - 1)), 1600)
    return () => clearInterval(t)
  }, [loading])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = url.trim()
    if (!trimmed) return
    setLoading(true)
    setError(null)
    setResult(null)
    const mode =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("mode") || undefined
        : undefined
    magnetEvent("input_submitted", { target_url: trimmed, mode })
    try {
      const res = await fetch("/api/magnet/roast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: trimmed,
          mode,
          referrer: typeof document !== "undefined" ? document.referrer : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Something went wrong.")
        return
      }
      setResult(data as RoastResult)
      magnetEvent("teaser_shown", { score: data.teaser?.score, target_url: trimmed, mode: data.teaser?.mode })
    } catch {
      setError("Network error — please try again.")
    } finally {
      setLoading(false)
    }
  }

  const claimHref = useMemo(() => {
    if (!result) return "/register"
    const m = encodeURIComponent(result.magnetSessionId)
    const studio = `/studio?magnet=${m}`
    if (status === "authenticated") return studio
    return `/register?magnet=${m}&callbackUrl=${encodeURIComponent(studio)}`
  }, [result, status])

  const shareUrl = useMemo(() => {
    if (!result || typeof window === "undefined") return ""
    return `${window.location.origin}/roast-landing/r/${result.shareId}`
  }, [result])

  const onShare = async () => {
    if (!shareUrl) return
    try {
      await navigator.clipboard.writeText(shareUrl)
      toast.success("Share link copied")
    } catch {
      toast.message(shareUrl)
    }
    magnetEvent("result_shared", { shareId: result?.shareId })
  }

  const reset = () => { setResult(null); setUrl(""); setError(null) }

  return (
    <Container>
      <section className={s.page}>
        {/* ── Hero + input (idle) ── */}
        {!result && !loading && (
          <>
            <div className={s.hero}>
              <span className={s.kicker}>Free conversion audit · no signup</span>
              <h1 className={s.title}>
                Your landing page is leaking customers.
                <br />
                <span className={s.titleAccent}>See exactly why — then watch Kalit rebuild it.</span>
              </h1>
              <p className={s.subtitle}>
                Paste your URL for an instant, in-depth conversion audit: a score, the issues
                costing you signups, and how to fix each one. Then watch Kalit rebuild the page, live.
              </p>
              <form onSubmit={handleSubmit} className={s.form}>
                <TextField
                  id="roast-url"
                  type="text"
                  inputMode="url"
                  placeholder="yourwebsite.com"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  autoFocus
                  className={s.urlField}
                />
                <Button type="submit" disabled={!url.trim()} icon="hugeicons:fire">
                  Roast it
                </Button>
              </form>
              {error && <p className={s.error}>{error}</p>}
            </div>

            <div className={s.steps}>
              {[
                { icon: "hugeicons:link-02", t: "Paste your URL", d: "Any landing page or site — no signup, no setup." },
                { icon: "hugeicons:ai-brain-03", t: "Get your audit", d: "A real conversion teardown: score, issues, impact, and fixes." },
                { icon: "hugeicons:magic-wand-01", t: "Watch Kalit rebuild it", d: "Sign in free and watch AI rebuild it live, keeping your brand." },
              ].map((x, i) => (
                <div key={i} className={s.step}>
                  <div className={s.stepIcon}><Icon icon={x.icon} /></div>
                  <div className={s.stepNum}>{i + 1}</div>
                  <h3>{x.t}</h3>
                  <p>{x.d}</p>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── Animated loading ── */}
        {loading && (
          <div className={s.loadingWrap}>
            <div className={s.loadingCard}>
              <div className={s.loadingHead}>
                <span className={s.loadingDial} />
                <div>
                  <h2>Roasting your page…</h2>
                  <p>{url.trim()}</p>
                </div>
              </div>
              <ul className={s.loadingSteps}>
                {LOADING_STEPS.map((ls, i) => (
                  <li key={i} className={s.loadingStep} data-state={i < step ? "done" : i === step ? "active" : "idle"}>
                    <span className={s.loadingStepIcon}>
                      <Icon icon={i < step ? "hugeicons:tick-02" : ls.icon} />
                    </span>
                    {ls.label}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* ── Result ── */}
        {result && (
          <div className={s.result}>
            <div className={s.resultHead}>
              <div className={s.scoreCard} style={{ ["--c" as string]: scoreColor(result.teaser.score) }}>
                <div className={s.scoreNum}>{result.teaser.score}</div>
                <div className={s.scoreOf}>/ 100</div>
              </div>
              <div className={s.resultHeadText}>
                <span className={s.resultUrl}>{result.teaser.finalUrl}</span>
                <h2 className={s.verdict}>{result.teaser.verdict || scoreVerdict(result.teaser.score)}</h2>
                <div className={s.bars}>
                  {Object.entries(result.teaser.breakdown).map(([k, v]) => (
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
                <Screenshot url={result.teaser.screenshotUrl} alt="Your landing page" />
                {result.teaser.wins.length > 0 && (
                  <div className={s.wins}>
                    <h3 className={s.winsTitle}><Icon icon="hugeicons:checkmark-badge-03" /> What's working</h3>
                    <ul>
                      {result.teaser.wins.map((w, i) => (
                        <li key={i}><Icon icon="hugeicons:tick-02" />{w}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className={s.findings}>
                <h3 className={s.findingsTitle}>
                  {result.teaser.problems.length} issues costing you customers
                </h3>
                {result.teaser.problems.map((p, i) => {
                  const cat = CATEGORY[p.category] || CATEGORY.design
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
                      {p.impact && (
                        <p className={s.findingLine}><span className={s.findingLabel}>Why it costs you</span>{p.impact}</p>
                      )}
                      {p.recommendation && (
                        <p className={s.findingLine} data-fix><span className={s.findingLabel}>The fix</span>{p.recommendation}</p>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            <div className={s.cta}>
              <div className={s.ctaText}>
                <h3>Stop reading about the fixes — watch Kalit do them.</h3>
                <p>Kalit rebuilds this page live, keeping your brand and fixing every issue above. Free to build &amp; preview on a kalit.ai link.</p>
              </div>
              <div className={s.ctaActions}>
                <Button href={claimHref} icon="hugeicons:magic-wand-01" onClick={() => magnetEvent("claim_started")}>
                  Rebuild it with Kalit
                </Button>
                <button type="button" className={s.linkBtn} onClick={onShare}>
                  <Icon icon="hugeicons:share-08" /> Share
                </button>
                <button type="button" className={s.linkBtn} onClick={reset}>
                  <Icon icon="hugeicons:refresh" /> Roast another
                </button>
              </div>
            </div>
          </div>
        )}
      </section>
    </Container>
  )
}
