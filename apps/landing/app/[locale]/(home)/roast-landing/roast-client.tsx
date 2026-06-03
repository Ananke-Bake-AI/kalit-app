"use client"

import { Button } from "@/components/button"
import { Container } from "@/components/container"
import { Icon } from "@/components/icon"
import { TextField } from "@/components/text-field"
import { magnetEvent } from "@/lib/magnet/events"
import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import s from "./roast.module.scss"

interface Problem {
  title: string
  detail: string
  severity: "high" | "medium" | "low"
}
interface Teaser {
  score: number
  breakdown: { clarity: number; design: number; conversion: number; mobile: number; trust: number }
  problems: Problem[]
  screenshotUrl: string
  finalUrl: string
  title: string | null
}
interface RoastResult {
  magnetSessionId: string
  shareId: string
  input: { url: string }
  teaser: Teaser
}

const BREAKDOWN_LABELS: Record<string, string> = {
  clarity: "Clarity",
  design: "Design",
  conversion: "Conversion",
  mobile: "Mobile",
  trust: "Trust",
}

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

export function RoastClient() {
  const [url, setUrl] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<RoastResult | null>(null)

  useEffect(() => {
    magnetEvent("tool_viewed")
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = url.trim()
    if (!trimmed) return
    setLoading(true)
    setError(null)
    setResult(null)
    magnetEvent("input_submitted", { target_url: trimmed })
    try {
      const res = await fetch("/api/magnet/roast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: trimmed,
          referrer: typeof document !== "undefined" ? document.referrer : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Something went wrong.")
        return
      }
      setResult(data as RoastResult)
      magnetEvent("teaser_shown", { score: data.teaser?.score, target_url: trimmed })
    } catch {
      setError("Network error — please try again.")
    } finally {
      setLoading(false)
    }
  }

  const claimHref = useMemo(() => {
    if (!result) return "/register"
    const m = encodeURIComponent(result.magnetSessionId)
    return `/register?magnet=${m}&callbackUrl=${encodeURIComponent(`/studio?magnet=${m}`)}`
  }, [result])

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

  return (
    <Container>
      <section className={s.page}>
        {!result && (
          <div className={s.hero}>
            <span className={s.kicker}>Free · instant · no signup</span>
            <h1 className={s.title}>
              Your landing page is leaking customers.
              <br />
              <span className={s.titleAccent}>See it rebuilt by Kalit.</span>
            </h1>
            <p className={s.subtitle}>
              Paste your URL. Get an instant conversion score and your 3 biggest problems —
              then watch Kalit rebuild the page, live.
            </p>
            <form onSubmit={handleSubmit} className={s.form}>
              <TextField
                id="roast-url"
                type="text"
                inputMode="url"
                placeholder="yourwebsite.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={loading}
                autoFocus
                className={s.urlField}
              />
              <Button type="submit" disabled={loading || !url.trim()} icon={loading ? "hugeicons:loading-03" : "hugeicons:fire"}>
                {loading ? "Roasting…" : "Roast it"}
              </Button>
            </form>
            {error && <p className={s.error}>{error}</p>}
            {loading && (
              <p className={s.loadingNote}>Loading the page, screenshotting it, and scoring conversion…</p>
            )}
          </div>
        )}

        {result && (
          <div className={s.result}>
            <div className={s.resultHead}>
              <div className={s.scoreCard} style={{ ["--c" as string]: scoreColor(result.teaser.score) }}>
                <div className={s.scoreNum}>{result.teaser.score}</div>
                <div className={s.scoreOf}>/ 100</div>
              </div>
              <div className={s.resultHeadText}>
                <span className={s.resultUrl}>{result.teaser.finalUrl}</span>
                <h2 className={s.verdict}>{scoreVerdict(result.teaser.score)}</h2>
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
              <div className={s.shotWrap}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className={s.shot} src={result.teaser.screenshotUrl} alt="Your landing page" loading="lazy" />
              </div>
              <div className={s.problems}>
                <h3 className={s.problemsTitle}>Your 3 biggest problems</h3>
                {result.teaser.problems.map((p, i) => (
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
                <h3>Want it fixed?</h3>
                <p>Watch Kalit rebuild this page live — keeping your brand, fixing these problems. Free to build &amp; preview.</p>
              </div>
              <div className={s.ctaActions}>
                <Button href={claimHref} icon="hugeicons:magic-wand-01" onClick={() => magnetEvent("claim_started")}>
                  Rebuild it with Kalit
                </Button>
                <button type="button" className={s.shareBtn} onClick={onShare}>
                  <Icon icon="hugeicons:share-08" /> Share
                </button>
                <button type="button" className={s.againBtn} onClick={() => { setResult(null); setUrl("") }}>
                  Roast another
                </button>
              </div>
            </div>
          </div>
        )}
      </section>
    </Container>
  )
}
