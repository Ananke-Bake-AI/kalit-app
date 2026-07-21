"use client"

import { Badge } from "@/components/badge"
import { Button } from "@/components/button"
import { SurfacePanel } from "@/components/surface-panel"
import {
  addModel,
  deleteModel,
  getAdminModels,
  setModelAdminOnly,
  setModelEnabled,
  setModelTier,
} from "@/server/actions/admin"
import { useEffect, useState, useTransition } from "react"
import s from "./models.module.scss"

type ModelRow = Awaited<ReturnType<typeof getAdminModels>>[number]

const TIERS = ["free", "starter", "pro", "enterprise"] as const
const PROVIDERS = ["ollama", "anthropic", "openai", "mistral"] as const

const TIER_COLOR: Record<string, string> = {
  free: "var(--text-secondary)",
  starter: "var(--accent)",
  pro: "var(--accent)",
  enterprise: "var(--text)",
}

export function ModelsClient({ initialModels }: { initialModels: ModelRow[] }) {
  const [models, setModels] = useState(initialModels)
  const [health, setHealth] = useState<Record<string, boolean>>({})
  const [isPending, startTransition] = useTransition()
  const [err, setErr] = useState<string | null>(null)

  // Live health (provider up / oauth present) from the broker's annotated /models.
  // Only enabled + admin-visible models appear there → others show "n/a".
  useEffect(() => {
    let stop = false
    const load = () =>
      fetch("/api/broker/models")
        .then((r) => r.json())
        .then((d: { groups?: { models?: { id: string; available?: boolean }[] }[] }) => {
          if (stop || !d?.groups) return
          const map: Record<string, boolean> = {}
          for (const g of d.groups) for (const m of g.models ?? []) if (m.id) map[m.id] = m.available !== false
          setHealth(map)
        })
        .catch(() => {})
    load()
    const t = setInterval(load, 20_000)
    return () => {
      stop = true
      clearInterval(t)
    }
  }, [])

  const run = (fn: () => Promise<ModelRow[]>) => {
    setErr(null)
    startTransition(async () => {
      try {
        setModels(await fn())
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Action failed")
      }
    })
  }

  // ── Add form ──
  const [nId, setNId] = useState("")
  const [nLabel, setNLabel] = useState("")
  const [nProvider, setNProvider] = useState<string>("ollama")
  const [nTier, setNTier] = useState<string>("starter")
  const [nAdmin, setNAdmin] = useState(false)
  const submitAdd = () => {
    if (!nId.trim() || !nLabel.trim()) {
      setErr("Name and technical ID are required")
      return
    }
    run(async () => {
      const next = await addModel({
        id: nId.trim(),
        label: nLabel.trim(),
        provider: nProvider,
        minTier: nTier,
        adminOnly: nAdmin,
      })
      setNId("")
      setNLabel("")
      setNAdmin(false)
      return next
    })
  }

  const healthDot = (id: string, enabled: boolean) => {
    if (!enabled) return <span className={s.dot} data-state="off" title="Disabled" />
    const up = health[id]
    if (up === undefined) return <span className={s.dot} data-state="unknown" title="Unknown" />
    return <span className={s.dot} data-state={up ? "up" : "down"} title={up ? "Reachable" : "Provider down"} />
  }

  return (
    <>
      <SurfacePanel
        spaced
        title="Models"
        subtitle={`${models.length} model${models.length !== 1 ? "s" : ""} · edits apply to the studio within ~30s`}
      >
        {err && <div className={s.err}>{err}</div>}
        <div className={s.table}>
          <div className={s.head}>
            <span>Health</span>
            <span>Model</span>
            <span>Provider</span>
            <span>Min tier</span>
            <span>Enabled</span>
            <span>Admin-only</span>
            <span />
          </div>

          {models.map((m) => (
            <div key={m.id} className={s.row} data-off={!m.enabled}>
              <span className={s.hcell}>{healthDot(m.id, m.enabled)}</span>
              <span className={s.model}>
                <span className={s.label}>{m.label}</span>
                <span className={s.id}>{m.id}</span>
              </span>
              <span>{m.provider}</span>
              <span>
                <select
                  className={s.select}
                  value={m.minTier}
                  disabled={isPending}
                  style={{ color: TIER_COLOR[m.minTier] }}
                  onChange={(e) => run(() => setModelTier(m.id, e.target.value))}
                >
                  {TIERS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </span>
              <span>
                <button
                  className={s.toggle}
                  data-on={m.enabled}
                  disabled={isPending}
                  onClick={() => run(() => setModelEnabled(m.id, !m.enabled))}
                  title={m.enabled ? "Enabled — click to disable" : "Disabled — click to enable"}
                >
                  <span className={s.knob} />
                </button>
              </span>
              <span>
                <button
                  className={s.toggle}
                  data-on={m.adminOnly}
                  disabled={isPending}
                  onClick={() => run(() => setModelAdminOnly(m.id, !m.adminOnly))}
                  title={m.adminOnly ? "Admin-only — click to make public" : "Public — click to restrict to admins"}
                >
                  <span className={s.knob} />
                </button>
              </span>
              <span className={s.actions}>
                <button
                  className={s.del}
                  disabled={isPending}
                  onClick={() => {
                    if (confirm(`Delete model "${m.label}" (${m.id})?`)) run(() => deleteModel(m.id))
                  }}
                  title="Delete model"
                >
                  ✕
                </button>
              </span>
            </div>
          ))}
          {models.length === 0 && <div className={s.empty}>No models. Add one below.</div>}
        </div>
      </SurfacePanel>

      <SurfacePanel spaced title="Add a model" subtitle="Register a new model — name + technical ID (what the broker/gateway expects)">
        <div className={s.add}>
          <label className={s.field}>
            <span>Display name</span>
            <input className={s.input} value={nLabel} onChange={(e) => setNLabel(e.target.value)} placeholder="e.g. kimi-k3" />
          </label>
          <label className={s.field}>
            <span>Technical ID</span>
            <input className={s.input} value={nId} onChange={(e) => setNId(e.target.value)} placeholder="e.g. cloud/kimi-k3:cloud" />
          </label>
          <label className={s.field}>
            <span>Provider</span>
            <select className={s.select} value={nProvider} onChange={(e) => setNProvider(e.target.value)}>
              {PROVIDERS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>
          <label className={s.field}>
            <span>Min tier</span>
            <select className={s.select} value={nTier} onChange={(e) => setNTier(e.target.value)}>
              {TIERS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label className={s.checkField}>
            <input type="checkbox" checked={nAdmin} onChange={(e) => setNAdmin(e.target.checked)} />
            <span>Admin-only (for testing)</span>
          </label>
          <Button onClick={submitAdd} disabled={isPending}>
            Add model
          </Button>
        </div>
      </SurfacePanel>

      <SurfacePanel spaced title="Legend">
        <div className={s.legend}>
          <span><span className={s.dot} data-state="up" /> Reachable (provider up)</span>
          <span><span className={s.dot} data-state="down" /> Provider down</span>
          <span><span className={s.dot} data-state="unknown" /> Unknown / not probed</span>
          <span><span className={s.dot} data-state="off" /> Disabled</span>
          <Badge>Admin-only models are hidden from non-admin users but usable for testing.</Badge>
        </div>
      </SurfacePanel>
    </>
  )
}
