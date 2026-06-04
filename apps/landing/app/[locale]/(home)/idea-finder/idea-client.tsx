"use client"

import { Button } from "@/components/button"
import { Container } from "@/components/container"
import { Icon } from "@/components/icon"
import { magnetEvent, type MagnetContext } from "@/lib/magnet/events"
import type { IdeaFull, IdeaPreview } from "@/lib/magnet/idea-types"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { BriefView } from "./brief-view"
import s from "./idea.module.scss"

const CTX: MagnetContext = { door: "idea_finder", slug: "idea-finder" }

const INTERESTS = [
  "AI & agents", "Dev tools", "Fintech", "Health & wellness", "Creator economy",
  "E-commerce", "Productivity", "Education", "Climate & energy", "Local services",
  "Marketing & sales", "Gaming",
]
const AUDIENCE = ["Businesses (B2B)", "Consumers (B2C)", "Developers", "Creators", "Small businesses", "Enterprises"]
const STAGE = ["Just exploring", "Validating an idea", "Ready to build"]

const LOADING_STEPS = [
  { icon: "hugeicons:profile-02", label: "Reading your profile" },
  { icon: "hugeicons:search-list-01", label: "Scanning 25+ trend sources" },
  { icon: "hugeicons:chart-average", label: "Scoring the strongest opportunities" },
  { icon: "hugeicons:ai-brain-03", label: "Writing your personal briefs" },
]

interface ScoutResponse {
  magnetSessionId: string
  shareId: string
  founderSummary: string
  ideas: IdeaPreview[]
  topProjectId: string | null
}

function MiniBars({ scores }: { scores: IdeaPreview["scores"] }) {
  const rows: [string, number][] = [
    ["Opportunity", scores.opportunity],
    ["Kalit fit", scores.kalitFit],
    ["Market", scores.market],
    ["Signal", scores.signal],
  ]
  return (
    <div className={s.miniBars}>
      {rows.map(([label, v]) => (
        <div key={label} className={s.miniBar}>
          <span className={s.miniLabel}>{label}</span>
          <span className={s.miniTrack}><span className={s.miniFill} style={{ width: `${v}%` }} /></span>
          <span className={s.miniVal}>{v}</span>
        </div>
      ))}
    </div>
  )
}

export function IdeaClient() {
  const { status } = useSession()
  const router = useRouter()

  // ── conversation state ──
  const [stepIdx, setStepIdx] = useState(0)
  const [goal, setGoal] = useState("")
  const [interests, setInterests] = useState<string[]>([])
  const [audience, setAudience] = useState("")
  const [stage, setStage] = useState("")

  const [phase, setPhase] = useState<"chat" | "loading" | "results">("chat")
  const [loadStep, setLoadStep] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const [result, setResult] = useState<ScoutResponse | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)
  const [fullIdeas, setFullIdeas] = useState<Record<string, IdeaFull>>({})
  const [unlocked, setUnlocked] = useState(false)
  const [unlocking, setUnlocking] = useState(false)
  const [building, setBuilding] = useState(false)

  useEffect(() => { magnetEvent("tool_viewed", {}, CTX) }, [])
  useEffect(() => {
    if (phase !== "loading") { setLoadStep(0); return }
    const t = setInterval(() => setLoadStep((p) => Math.min(p + 1, LOADING_STEPS.length - 1)), 1500)
    return () => clearInterval(t)
  }, [phase])

  const toggleInterest = (x: string) =>
    setInterests((cur) => (cur.includes(x) ? cur.filter((i) => i !== x) : [...cur, x]))

  const canAdvance = useMemo(() => {
    if (stepIdx === 0) return goal.trim().length > 2
    if (stepIdx === 1) return interests.length > 0
    if (stepIdx === 2) return !!audience
    return true
  }, [stepIdx, goal, interests, audience])

  const submit = async () => {
    setPhase("loading")
    setError(null)
    magnetEvent("scout_started", { interests: interests.join(","), audience, stage }, CTX)
    try {
      const res = await fetch("/api/magnet/idea", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile: { goal: goal.trim(), interests, audience, stage },
          referrer: typeof document !== "undefined" ? document.referrer : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Something went wrong.")
        setPhase("chat")
        return
      }
      setResult(data as ScoutResponse)
      setOpenId((data as ScoutResponse).ideas[0]?.projectId ?? null)
      setPhase("results")
      magnetEvent("ideas_matched", { count: (data as ScoutResponse).ideas.length }, CTX)
    } catch {
      setError("Network error — please try again.")
      setPhase("chat")
    }
  }

  const advance = () => {
    if (stepIdx < 3) setStepIdx((i) => i + 1)
    else void submit()
  }

  const openIdea = (id: string) => {
    setOpenId(id)
    magnetEvent("idea_opened", { projectId: id }, CTX)
    if (typeof window !== "undefined") {
      requestAnimationFrame(() => document.getElementById("idea-brief")?.scrollIntoView({ behavior: "smooth", block: "start" }))
    }
  }

  const unlock = async () => {
    if (!result) return
    if (status !== "authenticated") {
      magnetEvent("claim_started", { projectId: openId }, CTX)
      const focus = openId ? `?focus=${encodeURIComponent(openId)}` : ""
      const cb = `/idea-finder/i/${result.shareId}${focus}`
      router.push(`/register?magnet=${encodeURIComponent(result.magnetSessionId)}&callbackUrl=${encodeURIComponent(cb)}`)
      return
    }
    setUnlocking(true)
    try {
      const res = await fetch(`/api/magnet/${result.magnetSessionId}/unlock`, { method: "POST" })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || "Couldn't unlock."); return }
      const map: Record<string, IdeaFull> = {}
      for (const i of (data.ideas || []) as IdeaFull[]) map[i.projectId] = i
      setFullIdeas(map)
      setUnlocked(true)
      magnetEvent("brief_unlocked", { projectId: openId }, CTX)
    } catch {
      toast.error("Network error — please try again.")
    } finally {
      setUnlocking(false)
    }
  }

  const buildInFlow = async () => {
    if (!result || !openId) return
    setBuilding(true)
    magnetEvent("flow_upsell_clicked", { projectId: openId }, CTX)
    try {
      // Record which idea to build, then hand off to the studio (which claims
      // the session, provisions the trial, and runs the demo build).
      await fetch(`/api/magnet/${result.magnetSessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ buildProjectId: openId }),
      }).catch(() => {})
      router.push(`/studio?magnet=${encodeURIComponent(result.magnetSessionId)}`)
    } finally {
      setBuilding(false)
    }
  }

  const reset = () => {
    setResult(null); setOpenId(null); setUnlocked(false); setFullIdeas({})
    setStepIdx(0); setGoal(""); setInterests([]); setAudience(""); setStage("")
    setPhase("chat"); setError(null)
  }

  // ── answered turns (rendered as a chat thread) ──
  const answered: { q: string; a: string }[] = []
  if (stepIdx > 0) answered.push({ q: "What would you love to build?", a: goal.trim() })
  if (stepIdx > 1) answered.push({ q: "Which spaces pull you in?", a: interests.join(" · ") })
  if (stepIdx > 2) answered.push({ q: "Who do you want to serve?", a: audience })

  const openIdea_ = result?.ideas.find((i) => i.projectId === openId) || null
  const openFull = openId ? fullIdeas[openId] : undefined

  return (
    <Container>
      <section className={s.page}>
        {/* ── Hero + scout ── */}
        {phase === "chat" && (
          <>
            <div className={s.hero}>
              <span className={s.kicker}>60-second idea match · no signup</span>
              <h1 className={s.title}>
                Find the startup idea<br />
                <span className={s.titleAccent}>you were actually meant to build.</span>
              </h1>
              <p className={s.subtitle}>
                Tell the scout what you&apos;re into. It digs through 25+ trend sources, scores the hottest 2026
                openings, and hands you a real game plan: the market, the money, and exactly how to launch. Straight
                from live Kalit Search data.
              </p>
            </div>

            <div className={s.scout}>
              <div className={s.thread}>
                <div className={s.turn}>
                  <span className={s.avatar}><Icon icon="hugeicons:ai-chat-02" /></span>
                  <div className={s.bubble}>
                    Hey, I&apos;m your idea scout. Four quick taps and I&apos;ll pull the 2026 ventures that actually fit
                    you, scored on real demand. {STEP_Q[0]}
                  </div>
                </div>
                {answered.map((t, i) => (
                  <div key={i} className={`${s.turn} ${s.turnUser}`}>
                    <span className={s.avatar}><Icon icon="hugeicons:user" /></span>
                    <div className={`${s.bubble} ${s.bubbleUser}`}>{t.a || <em>skipped</em>}</div>
                  </div>
                ))}
                {stepIdx > 0 && stepIdx < 4 && (
                  <div className={s.turn}>
                    <span className={s.avatar}><Icon icon="hugeicons:ai-chat-02" /></span>
                    <div className={s.bubble}><strong>{REACT[stepIdx - 1]}</strong> {STEP_Q[stepIdx]}</div>
                  </div>
                )}
              </div>

              <div className={s.qcard}>
                <div className={s.progress}>
                  {[0, 1, 2, 3].map((i) => (
                    <span key={i} className={s.progressDot} data-state={i < stepIdx ? "done" : i === stepIdx ? "active" : "idle"} />
                  ))}
                  <span className={s.progressLabel}>Question {stepIdx + 1} of 4</span>
                </div>

                {stepIdx === 0 && (
                  <>
                    <textarea
                      id="goal" className={s.goalField} autoFocus value={goal}
                      placeholder="e.g. tools that help indie creators make money, or AI for small clinics"
                      onChange={(e) => setGoal(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && canAdvance) advance() }}
                    />
                    <span className={s.qhint}>{STEP_HINT[0]}</span>
                  </>
                )}
                {stepIdx === 1 && (
                  <>
                    <span className={s.qhint}>{STEP_HINT[1]}</span>
                    <div className={s.chips}>
                      {INTERESTS.map((x) => (
                        <button key={x} type="button" className={s.chip} data-selected={interests.includes(x)} onClick={() => toggleInterest(x)}>{x}</button>
                      ))}
                    </div>
                  </>
                )}
                {stepIdx === 2 && (
                  <>
                    <span className={s.qhint}>{STEP_HINT[2]}</span>
                    <div className={s.chips}>
                      {AUDIENCE.map((x) => (
                        <button key={x} type="button" className={s.chip} data-selected={audience === x} onClick={() => setAudience(x)}>{x}</button>
                      ))}
                    </div>
                  </>
                )}
                {stepIdx === 3 && (
                  <>
                    <span className={s.qhint}>{STEP_HINT[3]}</span>
                    <div className={s.chips}>
                      {STAGE.map((x) => (
                        <button key={x} type="button" className={s.chip} data-selected={stage === x} onClick={() => setStage(x)}>{x}</button>
                      ))}
                    </div>
                  </>
                )}

                <div className={s.qactions}>
                  <Button onClick={advance} disabled={!canAdvance} icon={stepIdx === 3 ? "hugeicons:sparkles" : "hugeicons:arrow-right-02"}>
                    {stepIdx === 3 ? "Show me my ideas" : "Continue"}
                  </Button>
                  {stepIdx === 1 && (
                    <button type="button" className={s.skip} onClick={() => setStepIdx(2)}>Skip</button>
                  )}
                  {stepIdx === 3 && (
                    <button type="button" className={s.skip} onClick={() => { setStage(""); void submit() }}>Skip</button>
                  )}
                </div>
                <span className={s.reassure}><Icon icon="hugeicons:flash" /> Takes about a minute. No signup, no card.</span>
                {error && <p className={s.error}>{error}</p>}
              </div>
            </div>
          </>
        )}

        {/* ── Loading ── */}
        {phase === "loading" && (
          <div className={s.loadingWrap}>
            <div className={s.loadingCard}>
              <div className={s.loadingHead}>
                <span className={s.loadingDial} />
                <div>
                  <h2>On the hunt…</h2>
                  <p>Reading the market for ventures that fit you.</p>
                </div>
              </div>
              <ul className={s.loadingSteps}>
                {LOADING_STEPS.map((ls, i) => (
                  <li key={i} className={s.loadingStep} data-state={i < loadStep ? "done" : i === loadStep ? "active" : "idle"}>
                    <span className={s.loadingStepIcon}><Icon icon={i < loadStep ? "hugeicons:tick-02" : ls.icon} /></span>
                    {ls.label}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* ── Results ── */}
        {phase === "results" && result && (
          <div className={s.results}>
            <div className={s.founder}>
              <Icon icon="hugeicons:ai-chat-02" />
              <p>{result.founderSummary} Here are your three strongest plays, ranked on real demand.</p>
            </div>

            <h2 className={s.resultsTitle}>Your 3 strongest matches</h2>
            <div className={s.ideas}>
              {result.ideas.map((idea) => {
                const op = idea.scores.opportunity
                return (
                  <button key={idea.projectId} type="button" className={s.ideaCard} data-active={openId === idea.projectId} onClick={() => openIdea(idea.projectId)}>
                    <div className={s.ideaTop}>
                      <span className={s.cat}>{idea.category}</span>
                      <span className={s.ring} style={{ ["--c" as string]: op >= 75 ? "#16a34a" : op >= 50 ? "#d97706" : "var(--color-4)" }}>
                        <span className={s.ringNum}>{op}</span>
                        <span className={s.ringLbl}>opp</span>
                      </span>
                    </div>
                    <div className={s.ideaName}>{idea.name}</div>
                    {idea.tagline && <div className={s.ideaTagline}>{idea.tagline}</div>}
                    <div className={s.ideaFit}>
                      <span className={s.fitLabel}>Why it fits you</span>
                      {idea.fitReason}
                    </div>
                    <MiniBars scores={idea.scores} />
                    <span className={s.openHint}>
                      {openId === idea.projectId ? "Showing below" : "See the full brief"}
                      <Icon icon="hugeicons:arrow-down-01" />
                    </span>
                  </button>
                )
              })}
            </div>

            {openIdea_ && (
              <div id="idea-brief">
                <BriefView
                  idea={openFull || openIdea_}
                  unlocked={unlocked && !!openFull}
                  onUnlock={unlock}
                  onBuild={buildInFlow}
                  unlocking={unlocking}
                  building={building}
                />
              </div>
            )}

            <div className={s.footActions}>
              <button type="button" className={s.linkBtn} onClick={reset}>
                <Icon icon="hugeicons:refresh" /> Start over
              </button>
              <Link className={s.linkBtn} href="/roast-landing">
                <Icon icon="hugeicons:fire" /> Got a page already? Roast it
              </Link>
            </div>
          </div>
        )}
      </section>
    </Container>
  )
}

const STEP_Q = [
  "What would you love to build? Or what problem quietly drives you nuts?",
  "Which worlds pull you in?",
  "Who do you want to build for?",
  "And where are you right now?",
]
const STEP_HINT = [
  "Dream out loud. The more real you get, the sharper your matches.",
  "Tap everything that lights you up. It steers the whole hunt.",
  "Your people. We hunt for ideas that need exactly them.",
  "No wrong answer. It just tunes the picks.",
]
const REACT = ["Love it.", "Great mix.", "Perfect."]
