import { Badge } from "@/components/badge"
import { EmptyPlaceholder } from "@/components/empty-placeholder"
import { auth } from "@/lib/auth"
import { brokerFetchAs } from "@/lib/broker-server"
import { getRemainingCredits, resolveEntitlements } from "@/lib/entitlements"
import { getServerTranslation, localeHref } from "@/lib/i18n-server"
import { redirect } from "next/navigation"
import type { CSSProperties } from "react"
import { SurfacePanel } from "@/components/surface-panel"
import s from "./usage.module.scss"

type UsageEvent = {
  eventId: string
  sessionId: string
  sessionTitle?: string
  service: string
  model: string
  tokensIn: number
  tokensOut: number
  cacheRead: number
  cacheWrite: number
  originTs: string
  receivedAt: string
}

type UsageListResponse = { events: UsageEvent[] }

type ModelPricing = { inPer1M: number; outPer1M: number; cacheWritePer1M: number; cacheReadPer1M: number }

// Mirrors kalit-broker/broker/internal/commands/billing.go modelPricingTable.
// Raw provider rates pre-profit (USD per 1M tokens); the constant below
// applies profitRatio=2.0 uniformly, matching the broker default.
const PROFIT_RATIO = 2.0
const MODEL_PRICING: Record<string, ModelPricing> = {
  "claude-opus-4": { inPer1M: 15, outPer1M: 75, cacheWritePer1M: 18.75, cacheReadPer1M: 1.5 },
  "claude-opus-4-1": { inPer1M: 15, outPer1M: 75, cacheWritePer1M: 18.75, cacheReadPer1M: 1.5 },
  "claude-opus-4-5": { inPer1M: 15, outPer1M: 75, cacheWritePer1M: 18.75, cacheReadPer1M: 1.5 },
  "claude-opus-4-6": { inPer1M: 15, outPer1M: 75, cacheWritePer1M: 18.75, cacheReadPer1M: 1.5 },
  "claude-opus-4-7": { inPer1M: 15, outPer1M: 75, cacheWritePer1M: 18.75, cacheReadPer1M: 1.5 },
  "claude-sonnet-4": { inPer1M: 3, outPer1M: 15, cacheWritePer1M: 3.75, cacheReadPer1M: 0.3 },
  "claude-sonnet-4-5": { inPer1M: 3, outPer1M: 15, cacheWritePer1M: 3.75, cacheReadPer1M: 0.3 },
  "claude-sonnet-4-6": { inPer1M: 3, outPer1M: 15, cacheWritePer1M: 3.75, cacheReadPer1M: 0.3 },
  "claude-haiku-3-5": { inPer1M: 0.8, outPer1M: 4, cacheWritePer1M: 1, cacheReadPer1M: 0.08 },
  "claude-haiku-4": { inPer1M: 1, outPer1M: 5, cacheWritePer1M: 1.25, cacheReadPer1M: 0.1 },
  "claude-haiku-4-5": { inPer1M: 1, outPer1M: 5, cacheWritePer1M: 1.25, cacheReadPer1M: 0.1 },
  "gpt-4o": { inPer1M: 2.5, outPer1M: 10, cacheWritePer1M: 0, cacheReadPer1M: 1.25 },
  "gpt-4o-mini": { inPer1M: 0.15, outPer1M: 0.6, cacheWritePer1M: 0, cacheReadPer1M: 0.075 },
  "gpt-5": { inPer1M: 10, outPer1M: 30, cacheWritePer1M: 0, cacheReadPer1M: 1 },
  "kimi-k2": { inPer1M: 0.6, outPer1M: 2.5, cacheWritePer1M: 0, cacheReadPer1M: 0 },
  "kimi-k2.5": { inPer1M: 0.6, outPer1M: 2.5, cacheWritePer1M: 0, cacheReadPer1M: 0 },
  "minimax-m2": { inPer1M: 0.3, outPer1M: 1.2, cacheWritePer1M: 0, cacheReadPer1M: 0 },
  "minimax-m2.5": { inPer1M: 0.3, outPer1M: 1.2, cacheWritePer1M: 0, cacheReadPer1M: 0 },
  "minimax-m2.7": { inPer1M: 0.3, outPer1M: 1.2, cacheWritePer1M: 0, cacheReadPer1M: 0 },
  "glm-4.6": { inPer1M: 0.6, outPer1M: 2.2, cacheWritePer1M: 0, cacheReadPer1M: 0 },
  "gpt-oss": { inPer1M: 0.2, outPer1M: 0.8, cacheWritePer1M: 0, cacheReadPer1M: 0 },
}
const FALLBACK_PRICING: ModelPricing = { inPer1M: 1, outPer1M: 5, cacheWritePer1M: 1.25, cacheReadPer1M: 0.1 }
const KNOWN_PROVIDERS = new Set(["anthropic", "openai", "ollama", "google", "bedrock", "vertex", "groq", "together", "deepseek", "mistral"])

function normalizeModel(m: string): string {
  let n = (m ?? "").trim().toLowerCase()
  if (!n) return ""
  const firstColon = n.indexOf(":")
  if (firstColon >= 0 && KNOWN_PROVIDERS.has(n.slice(0, firstColon))) {
    n = n.slice(firstColon + 1)
  }
  const tagColon = n.indexOf(":")
  if (tagColon >= 0) n = n.slice(0, tagColon)
  const parts = n.split("-")
  const last = parts[parts.length - 1]
  if (last && last.length === 8 && /^\d{8}$/.test(last)) {
    n = parts.slice(0, -1).join("-")
  }
  return n
}

function pricingFor(model: string): ModelPricing {
  const norm = normalizeModel(model)
  if (MODEL_PRICING[norm]) return MODEL_PRICING[norm]
  let rest = norm
  while (rest.includes("-")) {
    rest = rest.slice(0, rest.lastIndexOf("-"))
    if (MODEL_PRICING[rest]) return MODEL_PRICING[rest]
  }
  return FALLBACK_PRICING
}

function estimateCredits(model: string, tokensIn: number, tokensOut: number, cacheRead: number, cacheWrite: number): number {
  const p = pricingFor(model)
  const raw =
    (tokensIn / 1_000_000) * p.inPer1M +
    (tokensOut / 1_000_000) * p.outPer1M +
    (cacheRead / 1_000_000) * p.cacheReadPer1M +
    (cacheWrite / 1_000_000) * p.cacheWritePer1M
  return raw * PROFIT_RATIO
}

// Human label for the broker `service` tag. Keys match what
// kalit-usage reporters send (see broker/internal/broker/usage_report.go).
const SERVICE_LABELS: Record<string, string> = {
  findasset: "Asset search",
  taskforce: "Project build",
  agent: "Chat agent",
  "broker-flow": "Chat agent",
}

type SessionBucket = {
  sessionId: string
  title: string
  services: Map<string, { tokensIn: number; tokensOut: number; cacheRead: number; cacheWrite: number; events: number }>
  events: number
  tokensIn: number
  tokensOut: number
  cacheRead: number
  cacheWrite: number
  credits: number
  lastActivity: Date
}

function aggregateBySession(events: UsageEvent[]): SessionBucket[] {
  const map = new Map<string, SessionBucket>()
  for (const e of events) {
    const at = new Date(e.receivedAt)
    let cur = map.get(e.sessionId)
    if (!cur) {
      cur = {
        sessionId: e.sessionId,
        title: e.sessionTitle?.trim() || `Session ${e.sessionId.slice(0, 8)}`,
        services: new Map(),
        events: 0,
        tokensIn: 0,
        tokensOut: 0,
        cacheRead: 0,
        cacheWrite: 0,
        credits: 0,
        lastActivity: at,
      }
      map.set(e.sessionId, cur)
    }
    cur.events += 1
    cur.tokensIn += e.tokensIn
    cur.tokensOut += e.tokensOut
    cur.cacheRead += e.cacheRead
    cur.cacheWrite += e.cacheWrite
    cur.credits += estimateCredits(e.model, e.tokensIn, e.tokensOut, e.cacheRead, e.cacheWrite)
    if (at > cur.lastActivity) cur.lastActivity = at
    const svcKey = e.service || "unknown"
    const svc = cur.services.get(svcKey) ?? { tokensIn: 0, tokensOut: 0, cacheRead: 0, cacheWrite: 0, events: 0 }
    svc.tokensIn += e.tokensIn
    svc.tokensOut += e.tokensOut
    svc.cacheRead += e.cacheRead
    svc.cacheWrite += e.cacheWrite
    svc.events += 1
    cur.services.set(svcKey, svc)
    if (e.sessionTitle && cur.title.startsWith("Session ")) cur.title = e.sessionTitle.trim()
  }
  return [...map.values()].sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime())
}

type ServiceTotal = {
  service: string
  label: string
  credits: number
  tokensIn: number
  tokensOut: number
  cacheRead: number
  cacheWrite: number
}

function aggregateByService(events: UsageEvent[]): ServiceTotal[] {
  const map = new Map<string, ServiceTotal>()
  for (const e of events) {
    const key = e.service || "unknown"
    const cur = map.get(key) ?? {
      service: key,
      label: SERVICE_LABELS[key] ?? key,
      credits: 0,
      tokensIn: 0,
      tokensOut: 0,
      cacheRead: 0,
      cacheWrite: 0,
    }
    cur.credits += estimateCredits(e.model, e.tokensIn, e.tokensOut, e.cacheRead, e.cacheWrite)
    cur.tokensIn += e.tokensIn
    cur.tokensOut += e.tokensOut
    cur.cacheRead += e.cacheRead
    cur.cacheWrite += e.cacheWrite
    map.set(key, cur)
  }
  return [...map.values()].sort((a, b) => b.credits - a.credits)
}

const fmtNumber = new Intl.NumberFormat("en-US")
const fmtCredits = new Intl.NumberFormat("en-US", { maximumFractionDigits: 3 })
const fmtDate = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
})

export default async function UsagePage() {
  const session = await auth()
  if (!session?.user?.orgId) redirect(await localeHref("/login"))
  const { t } = await getServerTranslation()

  const orgId = session.user.orgId
  const entitlements = await resolveEntitlements(orgId)
  const remaining = await getRemainingCredits(orgId)
  const used = entitlements.creditsPerMonth - remaining
  const percentage = entitlements.creditsPerMonth > 0
    ? Math.round((used / entitlements.creditsPerMonth) * 100)
    : 0

  const usage = await brokerFetchAs<UsageListResponse>("/api/usage/events?limit=500")
  const events = usage?.events ?? []
  const sessions = aggregateBySession(events)
  const byService = aggregateByService(events)
  const totalEstimatedCredits = byService.reduce((sum, s) => sum + s.credits, 0)

  return (
    <>
      <SurfacePanel
        title={t("settingsPages.monthlyPool")}
        subtitle={t("settingsPages.monthlyPoolDesc")}
        headerAside={<Badge>{t("settingsPages.remaining", { count: remaining })}</Badge>}
      >
        <div className={s.meta}>
          <span>{t("settingsPages.creditsUsedMonth", { count: Math.max(used, 0) })}</span>
          <span>{t("settingsPages.creditsTotalAllowance", { count: entitlements.creditsPerMonth })}</span>
        </div>
        <div className={s.bar}>
          <div
            className={s.fill}
            style={
              { "--usage-fill-pct": `${Math.min(percentage, 100)}%` } as CSSProperties
            }
          />
        </div>
      </SurfacePanel>

      {byService.length > 0 ? (
        <SurfacePanel
          title={t("settingsPages.byService")}
          subtitle={t("settingsPages.byServiceDesc")}
        >
          <div className={s.serviceList}>
            {byService.map((svc) => {
              const pct = totalEstimatedCredits > 0
                ? Math.round((svc.credits / totalEstimatedCredits) * 100)
                : 0
              return (
                <div key={svc.service} className={s.serviceRow}>
                  <div className={s.serviceHead}>
                    <span className={s.serviceLabel}>{svc.label}</span>
                    <span className={s.servicePct}>{pct}%</span>
                  </div>
                  <div className={s.serviceBar}>
                    <div
                      className={s.serviceFill}
                      style={{ "--usage-fill-pct": `${pct}%` } as CSSProperties}
                    />
                  </div>
                  <div className={s.serviceMeta}>
                    <span>~{fmtCredits.format(svc.credits)} {t("settingsPages.creditsShort")}</span>
                    <span>{fmtNumber.format(svc.tokensIn + svc.tokensOut + svc.cacheRead + svc.cacheWrite)} tokens</span>
                  </div>
                </div>
              )
            })}
          </div>
          <p className={s.footnote}>{t("settingsPages.creditsEstimateNote")}</p>
        </SurfacePanel>
      ) : null}

      <SurfacePanel title={t("settingsPages.recentUsage")} subtitle={t("settingsPages.recentUsageDesc")}>
        {sessions.length === 0 ? (
          <EmptyPlaceholder
            title={t("settingsPages.noUsage")}
            description={t("settingsPages.noUsageDesc")}
          />
        ) : (
          <div className={s.history}>
            {sessions.map((row) => (
              <div key={row.sessionId} className={s.eventRow}>
                <div className={s.eventMain}>
                  <div className={s.eventTitle}>
                    <span>{row.title}</span>
                    {[...row.services.keys()].map((svc) => (
                      <span key={svc} className={s.service}>{SERVICE_LABELS[svc] ?? svc}</span>
                    ))}
                  </div>
                  <div className={s.eventSubtitle}>
                    {fmtDate.format(row.lastActivity)} · {row.events} event{row.events > 1 ? "s" : ""}
                  </div>
                </div>
                <div className={s.eventMeta}>
                  <span className={s.credits}>~{fmtCredits.format(row.credits)} {t("settingsPages.creditsShort")}</span>
                  <span className={s.tokensIn}>{fmtNumber.format(row.tokensIn + row.cacheRead)} in</span>
                  <span className={s.tokensOut}>{fmtNumber.format(row.tokensOut + row.cacheWrite)} out</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </SurfacePanel>
    </>
  )
}
