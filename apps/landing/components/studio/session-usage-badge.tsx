"use client"

import { useEffect, useRef, useState } from "react"
import s from "./session-usage-badge.module.scss"

type UsageEvent = {
  eventId: string
  tokensIn: number
  tokensOut: number
  receivedAt: string
}

const fmt = new Intl.NumberFormat("en-US")
const POLL_MS = 3000

export function SessionUsageBadge({ sessionId }: { sessionId: string | null }) {
  const [tokensIn, setTokensIn] = useState(0)
  const [tokensOut, setTokensOut] = useState(0)
  const [flash, setFlash] = useState(false)
  const seenIds = useRef<Set<string>>(new Set())

  useEffect(() => {
    seenIds.current = new Set()
    setTokensIn(0)
    setTokensOut(0)
    if (!sessionId) return
    let cancelled = false

    const tick = async () => {
      try {
        const res = await fetch(`/api/usage/session?sessionId=${encodeURIComponent(sessionId)}&limit=200`, { cache: "no-store" })
        if (!res.ok) return
        const data = (await res.json()) as { events: UsageEvent[] }
        if (cancelled) return
        let addedIn = 0
        let addedOut = 0
        let fresh = false
        for (const e of data.events) {
          if (seenIds.current.has(e.eventId)) continue
          seenIds.current.add(e.eventId)
          addedIn += e.tokensIn
          addedOut += e.tokensOut
          fresh = true
        }
        if (fresh) {
          setTokensIn((v) => v + addedIn)
          setTokensOut((v) => v + addedOut)
          setFlash(true)
          setTimeout(() => !cancelled && setFlash(false), 900)
        }
      } catch {}
    }

    tick()
    const id = setInterval(tick, POLL_MS)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [sessionId])

  if (!sessionId) return null
  const total = tokensIn + tokensOut

  return (
    <div className={s.badge} data-flash={flash ? "1" : undefined} title="Tokens consumed this session (broker usage events)">
      <span className={s.dot} />
      <span className={s.value}>
        <span className={s.tokensIn}>{fmt.format(tokensIn)}</span>
        <span className={s.sep}>/</span>
        <span className={s.tokensOut}>{fmt.format(tokensOut)}</span>
      </span>
      <span className={s.label}>tok{total === 1 ? "" : "s"}</span>
    </div>
  )
}
