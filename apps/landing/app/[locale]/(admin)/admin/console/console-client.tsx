"use client"

import { SurfacePanel } from "@/components/surface-panel"
import { EmptyPlaceholder } from "@/components/empty-placeholder"
import { useEffect, useMemo, useRef, useState } from "react"
import s from "./console.module.scss"

export type UsageEvent = {
  eventId: string
  sessionId: string
  sessionTitle?: string
  externalUserId?: string
  service: string
  model: string
  tokensIn: number
  tokensOut: number
  cacheRead: number
  cacheWrite: number
  originTs: string
  receivedAt: string
}

const POLL_INTERVAL_MS = 3000
const MAX_ROWS = 300

const fmt = new Intl.NumberFormat("en-US")
const fmtTime = new Intl.DateTimeFormat("en-US", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
})

function aggregateByService(events: UsageEvent[]) {
  const map = new Map<string, { tokensIn: number; tokensOut: number; events: number }>()
  for (const e of events) {
    const key = e.service || "unknown"
    const cur = map.get(key) ?? { tokensIn: 0, tokensOut: 0, events: 0 }
    cur.tokensIn += e.tokensIn
    cur.tokensOut += e.tokensOut
    cur.events += 1
    map.set(key, cur)
  }
  return [...map.entries()].sort((a, b) => b[1].tokensIn + b[1].tokensOut - (a[1].tokensIn + a[1].tokensOut))
}

export function ConsoleClient({ initialEvents }: { initialEvents: UsageEvent[] }) {
  const [events, setEvents] = useState<UsageEvent[]>(initialEvents)
  const [flashIds, setFlashIds] = useState<Set<string>>(new Set())
  const [live, setLive] = useState(true)
  const latestRef = useRef<string | null>(initialEvents[0]?.receivedAt ?? null)

  useEffect(() => {
    if (!live) return
    let cancelled = false
    const tick = async () => {
      try {
        const qs = new URLSearchParams()
        if (latestRef.current) qs.set("since", latestRef.current)
        qs.set("limit", "100")
        const res = await fetch(`/api/admin/usage-events?${qs.toString()}`, { cache: "no-store" })
        if (!res.ok) return
        const data = (await res.json()) as { events: UsageEvent[] }
        if (cancelled || !data.events?.length) return

        const newIds = new Set(data.events.map((e) => e.eventId))
        setFlashIds(newIds)
        setEvents((prev) => {
          const merged = [...data.events, ...prev]
          const seen = new Set<string>()
          const deduped: UsageEvent[] = []
          for (const e of merged) {
            if (seen.has(e.eventId)) continue
            seen.add(e.eventId)
            deduped.push(e)
            if (deduped.length >= MAX_ROWS) break
          }
          return deduped
        })
        latestRef.current = data.events[0].receivedAt
        setTimeout(() => {
          if (!cancelled) setFlashIds(new Set())
        }, 1200)
      } catch {}
    }
    const id = setInterval(tick, POLL_INTERVAL_MS)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [live])

  const totals = useMemo(() => {
    const tokensIn = events.reduce((a, e) => a + e.tokensIn, 0)
    const tokensOut = events.reduce((a, e) => a + e.tokensOut, 0)
    const cacheRead = events.reduce((a, e) => a + e.cacheRead, 0)
    const cacheWrite = events.reduce((a, e) => a + e.cacheWrite, 0)
    return { tokensIn, tokensOut, cacheRead, cacheWrite, count: events.length }
  }, [events])

  const byService = useMemo(() => aggregateByService(events), [events])

  return (
    <>
      <SurfacePanel
        spaced
        title="Live consumption"
        subtitle={`${totals.count} recent events across all users`}
        headerAside={
          <label className={s.liveToggle}>
            <input type="checkbox" checked={live} onChange={(e) => setLive(e.target.checked)} />
            <span className={s.liveDot} data-live={live} />
            <span>{live ? "Live" : "Paused"}</span>
          </label>
        }
      >
        <div className={s.statGrid}>
          <Stat label="Tokens in" value={fmt.format(totals.tokensIn)} />
          <Stat label="Tokens out" value={fmt.format(totals.tokensOut)} />
          <Stat label="Cache read" value={fmt.format(totals.cacheRead)} />
          <Stat label="Cache write" value={fmt.format(totals.cacheWrite)} />
        </div>

        <div className={s.serviceList}>
          {byService.map(([svc, v]) => (
            <div key={svc} className={s.serviceRow}>
              <span className={s.serviceName}>{svc}</span>
              <span className={s.serviceMeta}>
                <span>{v.events} ev</span>
                <span className={s.tokensIn}>{fmt.format(v.tokensIn)} in</span>
                <span className={s.tokensOut}>{fmt.format(v.tokensOut)} out</span>
              </span>
            </div>
          ))}
          {byService.length === 0 && <div className={s.empty}>No data yet.</div>}
        </div>
      </SurfacePanel>

      <SurfacePanel spaced title="Event stream" subtitle="Most recent first">
        {events.length === 0 ? (
          <EmptyPlaceholder title="No usage yet" description="Events will appear here as users run jobs." />
        ) : (
          <div className={s.stream}>
            {events.map((e) => (
              <div
                key={e.eventId}
                className={s.streamRow}
                data-flash={flashIds.has(e.eventId) ? "1" : undefined}
              >
                <span className={s.time}>{fmtTime.format(new Date(e.receivedAt))}</span>
                <span className={s.user} title={e.externalUserId}>
                  {e.externalUserId ? e.externalUserId.slice(0, 8) : "—"}
                </span>
                <span className={s.service}>{e.service}</span>
                <span className={s.model}>{e.model || "—"}</span>
                <span className={s.tokensIn}>{fmt.format(e.tokensIn)} in</span>
                <span className={s.tokensOut}>{fmt.format(e.tokensOut)} out</span>
                <span className={s.session} title={e.sessionTitle || e.sessionId}>
                  {e.sessionTitle || e.sessionId.slice(0, 8)}
                </span>
              </div>
            ))}
          </div>
        )}
      </SurfacePanel>
    </>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className={s.stat}>
      <span className={s.statLabel}>{label}</span>
      <span className={s.statValue}>{value}</span>
    </div>
  )
}
