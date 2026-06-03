"use client"

import { Icon } from "@/components/icon"
import { magnetEvent, type MagnetContext } from "@/lib/magnet/events"
import type { IdeaFull, IdeaPreview } from "@/lib/magnet/idea-types"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { BriefView } from "../../brief-view"
import s from "../../idea.module.scss"

const CTX: MagnetContext = { door: "idea_finder", slug: "idea-finder" }

export function ShareBrief({
  magnetSessionId,
  shareId,
  ideas,
  unlocked,
  viewerAuthed,
  initialFocusId,
}: {
  magnetSessionId: string
  shareId: string
  ideas: (IdeaPreview | IdeaFull)[]
  unlocked: boolean
  viewerAuthed: boolean
  initialFocusId: string | null
}) {
  const router = useRouter()
  const [focusId, setFocusId] = useState<string | null>(initialFocusId || ideas[0]?.projectId || null)
  const [building, setBuilding] = useState(false)

  // Owner returning authenticated: attach the lead (idempotent) once.
  useEffect(() => {
    if (unlocked && viewerAuthed) {
      void fetch(`/api/magnet/${magnetSessionId}/unlock`, { method: "POST" }).catch(() => {})
    }
  }, [unlocked, viewerAuthed, magnetSessionId])

  const focus = ideas.find((i) => i.projectId === focusId) || ideas[0] || null
  if (!focus) return null

  const onUnlock = () => {
    if (viewerAuthed) {
      // Authenticated but not the owner — let them run their own scout.
      router.push("/idea-finder")
      return
    }
    magnetEvent("claim_started", { projectId: focus.projectId, via: "share" }, CTX)
    const f = focus.projectId ? `?focus=${encodeURIComponent(focus.projectId)}` : ""
    const cb = `/idea-finder/i/${shareId}${f}`
    router.push(`/register?magnet=${encodeURIComponent(magnetSessionId)}&callbackUrl=${encodeURIComponent(cb)}`)
  }

  const onBuild = async () => {
    setBuilding(true)
    magnetEvent("flow_upsell_clicked", { projectId: focus.projectId, via: "share" }, CTX)
    try {
      await fetch(`/api/magnet/${magnetSessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ buildProjectId: focus.projectId }),
      }).catch(() => {})
      router.push(`/studio?magnet=${encodeURIComponent(magnetSessionId)}`)
    } finally {
      setBuilding(false)
    }
  }

  return (
    <div className={s.results}>
      {ideas.length > 1 && (
        <div className={s.ideas}>
          {ideas.map((idea) => {
            const op = idea.scores.opportunity
            return (
              <button key={idea.projectId} type="button" className={s.ideaCard} data-active={focus.projectId === idea.projectId} onClick={() => setFocusId(idea.projectId)}>
                <div className={s.ideaTop}>
                  <span className={s.cat}>{idea.category}</span>
                  <span className={s.ring} style={{ ["--c" as string]: op >= 75 ? "#16a34a" : op >= 50 ? "#d97706" : "var(--color-4)" }}>
                    <span className={s.ringNum}>{op}</span>
                    <span className={s.ringLbl}>opp</span>
                  </span>
                </div>
                <div className={s.ideaName}>{idea.name}</div>
                {idea.tagline && <div className={s.ideaTagline}>{idea.tagline}</div>}
              </button>
            )
          })}
        </div>
      )}

      <div id="idea-brief">
        <BriefView
          idea={focus}
          unlocked={unlocked}
          onUnlock={onUnlock}
          onBuild={unlocked ? onBuild : undefined}
          building={building}
        />
      </div>

      <div className={s.footActions}>
        <Link className={s.linkBtn} href="/idea-finder">
          <Icon icon="hugeicons:sparkles" /> Find your own startup idea
        </Link>
      </div>
    </div>
  )
}
