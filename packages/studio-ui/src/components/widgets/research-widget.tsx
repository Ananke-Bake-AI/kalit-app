"use client"

import { useState, useEffect, useRef, useCallback, type ReactNode } from "react"
import { brokerFetch, toFindAssetsUrl } from "../../host"
import { useI18n } from "@kalit/i18n/react"
import { Icon } from "../../primitives/icon"
import s from "./widgets.module.scss"

type ResearchStatus = "running" | "finished" | "interrupted" | "error"

const IMAGE_EXTS = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp", ".svg"]
const AUDIO_EXTS = [".wav", ".mp3", ".ogg", ".flac", ".aac"]
const MODEL3D_EXTS = [".glb", ".gltf", ".obj", ".stl", ".ply", ".fbx", ".dae"]

function getExt(path: string): string {
  const dot = path.lastIndexOf(".")
  return dot >= 0 ? path.slice(dot).toLowerCase() : ""
}

function proxyAssetUrl(url: string): string {
  return toFindAssetsUrl(url) || url
}

function isImage(path: string) { return IMAGE_EXTS.includes(getExt(path)) }
function isAudio(path: string) { return AUDIO_EXTS.includes(getExt(path)) }
function is3D(path: string) { return MODEL3D_EXTS.includes(getExt(path)) }

interface Asset {
  path: string
  filename: string
  url?: string
  description?: string
  previewUrl: string
  proxyUrl: string
}

interface ResearchData {
  status: ResearchStatus
  prompt: string
  assetCount: number
  assets: Asset[]
  startedAt?: string
}

interface ResearchWidgetProps {
  researchId: string
  onCompleted?: () => void
  onPreviewFile?: (file: { url: string; name: string }, images?: { url: string; name: string }[]) => void
}

function formatElapsed(startedAt: string | undefined): string {
  if (!startedAt) return "0s"
  const ms = Date.now() - new Date(startedAt).getTime()
  const sec = Math.floor(ms / 1000)
  const min = Math.floor(sec / 60)
  if (min > 0) return `${min}m ${sec % 60}s`
  return `${sec}s`
}

function audioMime(path: string): string {
  const mimes: Record<string, string> = {
    ".mp3": "audio/mpeg", ".wav": "audio/wav", ".ogg": "audio/ogg",
    ".flac": "audio/flac", ".aac": "audio/aac",
  }
  return mimes[getExt(path)] || "audio/mpeg"
}

// ── Asset previews ──

function ImagePreview({ asset, onPreview }: { asset: Asset; onPreview?: (f: { url: string; name: string }) => void }) {
  const [failed, setFailed] = useState(false)
  const proxied = proxyAssetUrl(asset.previewUrl)
  if (failed) return <FilePreview asset={asset} />
  return (
    <img
      src={proxied}
      alt={asset.filename}
      loading="lazy"
      onError={() => setFailed(true)}
      className={s.assetThumb}
      onClick={() => onPreview?.({ url: proxied, name: asset.filename })}
    />
  )
}

function AudioPreview({ asset }: { asset: Asset }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "var(--size-1-5)", minWidth: 180 }}>
      <Icon icon="hugeicons:volume-high" style={{ fontSize: "0.85rem", color: "var(--color-3)" }} />
      <audio controls preload="metadata" style={{ height: 24, flex: 1 }}>
        <source src={asset.proxyUrl} type={audioMime(asset.path)} />
      </audio>
      <span style={{ fontSize: "0.55rem", color: "var(--text-secondary)" }}>{asset.filename}</span>
    </div>
  )
}

function FilePreview({ asset }: { asset: Asset }) {
  const proxied = proxyAssetUrl(asset.previewUrl || "")
  return (
    <a href={proxied || "#"} download={asset.filename} className={s.assetFile} title={asset.filename}>
      <Icon icon={is3D(asset.path) ? "hugeicons:cube-01" : "hugeicons:file-02"} />
      <span className={s.assetLabel}>{asset.filename}</span>
    </a>
  )
}

function AssetPreview({ asset, onPreview }: { asset: Asset; onPreview?: (f: { url: string; name: string }) => void }) {
  if (!asset?.path) return null
  if (isImage(asset.path)) return <ImagePreview asset={asset} onPreview={onPreview} />
  if (isAudio(asset.path)) return <AudioPreview asset={asset} />
  return <FilePreview asset={asset} />
}

// ── Vote bar ──
//
// Community vote (good / average / bad) on a finished research. Routed
// browser → landing proxy → broker → find-assets (PATCH /vote), which
// increments the tallies and feeds the MemRL reward loop. Icon-only,
// inline SVG (no emoji), colours match the find-assets native UI.

const VOTE_OPTS: { key: string; cls: string; title: string; icon: ReactNode }[] = [
  { key: "good", cls: s.voteGood, title: "Good", icon: (<><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3z" /><path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" /></>) },
  { key: "average", cls: s.voteAverage, title: "Average", icon: (<line x1="5" y1="12" x2="19" y2="12" />) },
  { key: "bad", cls: s.voteBad, title: "Bad", icon: (<><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3z" /><path d="M17 2h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17" /></>) },
]

function VoteBar({ researchId }: { researchId: string }) {
  const [vote, setVote] = useState<string | null>(null)
  const [counts, setCounts] = useState<Record<string, number> | null>(null)
  const [busy, setBusy] = useState(false)

  const cast = async (v: string) => {
    if (busy) return
    const next = vote === v ? "" : v
    const prevVote = vote
    const prevCounts = counts
    setBusy(true)
    setVote(next || null)
    try {
      const res = await brokerFetch(`/api/broker/research/${researchId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vote: next }),
      })
      const json = (await res.json().catch(() => ({}))) as {
        data?: { votes?: Record<string, number>; user_vote?: string | null }
      }
      if (res.ok && json.data) {
        setVote(json.data.user_vote ?? null)
        setCounts(json.data.votes ?? null)
      } else {
        setVote(prevVote)
        setCounts(prevCounts)
      }
    } catch {
      setVote(prevVote)
      setCounts(prevCounts)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={s.voteBar}>
      {VOTE_OPTS.map((o) => {
        const active = vote === o.key
        return (
          <button
            key={o.key}
            type="button"
            title={o.title}
            aria-label={o.title}
            aria-pressed={active}
            disabled={busy}
            onClick={() => cast(o.key)}
            className={`${s.voteBtn} ${o.cls} ${active ? s.voteActive : ""}`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              {o.icon}
            </svg>
            {counts ? <span className={s.voteCount}>{counts[o.key] ?? 0}</span> : null}
          </button>
        )
      })}
    </div>
  )
}

// ── Main widget ──

export function ResearchWidget({ researchId, onCompleted, onPreviewFile }: ResearchWidgetProps) {
  const { t } = useI18n()
  const [data, setData] = useState<ResearchData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [now, setNow] = useState(Date.now())
  const finishedRef = useRef(false)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stopPolling = useCallback(() => {
    if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null }
  }, [])

  const failureCountRef = useRef(0)
  const fetchStatus = useCallback(async () => {
    if (finishedRef.current) return
    try {
      const res = await brokerFetch(`/api/broker/research/${researchId}/status`)
      if (!res.ok) {
        if (res.status === 404) { setError(t("studio.researchNotFound")); stopPolling(); return }
        // Any other non-ok (5xx, 401, taskforce rework) — after 3 strikes
        // surface an error instead of leaving the widget in infinite skeleton.
        failureCountRef.current += 1
        if (failureCountRef.current >= 3) {
          setError(t("studio.networkError"))
        }
        return
      }
      failureCountRef.current = 0
      const json = await res.json()
      if (!json.success) { setError(json.error || t("studio.networkError")); return }
      setData(json.data)
      setError(null)
      if (json.data.status !== "running") {
        finishedRef.current = true
        stopPolling()
        if (json.data.status === "finished" && onCompleted) setTimeout(onCompleted, 2000)
      }
    } catch {
      failureCountRef.current += 1
      if (failureCountRef.current >= 3) setError(t("studio.networkError"))
    }
  }, [researchId, stopPolling, onCompleted, t])

  const fetchStatusRef = useRef(fetchStatus)
  fetchStatusRef.current = fetchStatus
  useEffect(() => {
    const doFetch = () => fetchStatusRef.current()
    void doFetch()
    pollingRef.current = setInterval(doFetch, 5000)
    return stopPolling
  }, [researchId, stopPolling])

  useEffect(() => {
    if (data?.status !== "running") return
    const timer = setInterval(() => setNow(Date.now()), 5000)
    return () => clearInterval(timer)
  }, [data?.status])

  // ── Render helpers ──
  //
  // Every phase of the widget renders the SAME 3-row layout so the
  // card never resizes between transitions:
  //   row 1 — status header (pulse / spinner / check + label)
  //   row 2 — prompt blurb (skeleton bar while we don't have it yet)
  //   row 3 — asset grid (placeholder thumbs while waiting, real
  //           thumbs once the search finishes)
  // Without this the widget grew ~80 px when results landed and the
  // chat scrolled out from under the user's cursor on every search
  // resolution.

  const PLACEHOLDER_THUMB_COUNT = 3

  function renderThumbPlaceholders(count: number) {
    return (
      <div className={s.assetGrid}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={`ph-${i}`} className={s.assetThumbSkeleton} />
        ))}
      </div>
    )
  }

  // Skeleton — same shape as running, just no data yet.
  if (!data && !error) {
    return (
      <div className={s.card}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--size-2)" }}>
          <div className={s.header}>
            <span className={s.dotInfo}>
              <span className={s.dotPulse} style={{ background: "var(--color-2)" }} />
            </span>
            <span style={{ fontSize: "0.78rem", color: "var(--text)" }}>{t("studio.searchingAssets")}</span>
          </div>
          <span style={{ fontSize: "0.65rem", color: "var(--text-secondary)" }}>—</span>
        </div>
        <div className={s.skeletonLine} style={{ width: "66%", marginLeft: 26 }} />
        {renderThumbPlaceholders(PLACEHOLDER_THUMB_COUNT)}
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className={s.cardDanger}>
        <p className={s.desc} style={{ color: "var(--danger)" }}>{error}</p>
      </div>
    )
  }

  if (!data) return null

  // ── Finished ──
  if (data.status === "finished") {
    const images = data.assets.filter((a) => isImage(a.path))
    const audios = data.assets.filter((a) => isAudio(a.path))
    const others = data.assets.filter((a) => !isImage(a.path) && !isAudio(a.path))

    const imageItems = images.map((a) => ({ url: proxyAssetUrl(a.previewUrl), name: a.filename }))
    const handleImagePreview = (file: { url: string; name: string }) => {
      onPreviewFile?.(file, imageItems)
    }

    // Match the running phase's row layout exactly: header, prompt
    // line, asset grid. If the search legitimately returned 0
    // assets we still render an empty grid row of placeholder size
    // so the card doesn't pop shorter than its running view.
    const hasAnyAssets = images.length > 0 || audios.length > 0 || others.length > 0

    return (
      <div className={s.cardSuccess}>
        <div className={s.header}>
          <span className={s.dotSuccess}><Icon icon="hugeicons:tick-02" /></span>
          <span className={`${s.statusLabel} ${s.textSuccess}`}>
            {data.assetCount !== 1 ? t("studio.foundAssetsPlural").replace("{count}", String(data.assetCount)) : t("studio.foundAssets").replace("{count}", String(data.assetCount))}
          </span>
        </div>

        {data.prompt && (
          <p className={s.desc} style={{ paddingLeft: 26 }}>{data.prompt}</p>
        )}

        {images.length > 0 && (
          <div className={s.assetGrid}>
            {images.map((a, i) => <AssetPreview key={i} asset={a} onPreview={handleImagePreview} />)}
          </div>
        )}

        {audios.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {audios.map((a, i) => <AssetPreview key={i} asset={a} />)}
          </div>
        )}

        {others.length > 0 && (
          <div className={s.assetGrid}>
            {others.map((a, i) => <AssetPreview key={i} asset={a} />)}
          </div>
        )}

        {!hasAnyAssets && renderThumbPlaceholders(1)}

        <VoteBar researchId={researchId} />
      </div>
    )
  }

  // ── Error / Interrupted ──
  if (data.status === "error" || data.status === "interrupted") {
    return (
      <div className={s.cardDanger}>
        <div className={s.header}>
          <span className={s.dotDanger}><Icon icon="hugeicons:cancel-01" /></span>
          <span className={`${s.statusLabel} ${s.textDanger}`}>{t("studio.searchStatus").replace("{status}", data.status)}</span>
        </div>
      </div>
    )
  }

  // ── Running ──
  void now
  // If partial assets have already streamed in, pad with placeholder
  // thumbs up to PLACEHOLDER_THUMB_COUNT so the row stays the same
  // height as it'll be at finish.
  const runningAssets = data.assets ?? []
  const padCount = Math.max(0, PLACEHOLDER_THUMB_COUNT - runningAssets.length)
  return (
    <div className={s.card}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--size-2)" }}>
        <div className={s.header}>
          <span className={s.dotInfo}>
            <span className={s.dotPulse} style={{ background: "var(--color-2)" }} />
          </span>
          <span style={{ fontSize: "0.78rem", color: "var(--text)" }}>{t("studio.searchingAssets")}</span>
        </div>
        <span style={{ fontSize: "0.65rem", color: "var(--text-secondary)" }}>{formatElapsed(data.startedAt)}</span>
      </div>
      {data.prompt ? (
        <p className={s.desc} style={{ paddingLeft: 26 }}>{data.prompt}</p>
      ) : (
        <div className={s.skeletonLine} style={{ width: "66%", marginLeft: 26 }} />
      )}
      <div className={s.assetGrid}>
        {runningAssets.map((a, i) => <AssetPreview key={`a-${i}`} asset={a} />)}
        {Array.from({ length: padCount }).map((_, i) => (
          <div key={`ph-${i}`} className={s.assetThumbSkeleton} />
        ))}
      </div>
    </div>
  )
}
