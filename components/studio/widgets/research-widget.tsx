"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { brokerFetch } from "@/lib/broker-direct"
import { useI18n } from "@/stores/i18n"
import { Icon } from "@/components/icon"
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
  if (!url) return url
  const match = url.match(/https?:\/\/[^/]+\/(.+)/)
  if (match) return `/api/broker/find-assets/${match[1]}`
  return url
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

  const fetchStatus = useCallback(async () => {
    if (finishedRef.current) return
    try {
      const res = await brokerFetch(`/api/broker/research/${researchId}/status`)
      if (!res.ok) {
        if (res.status === 404) { setError(t("studio.researchNotFound")); stopPolling() }
        return
      }
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
      setError(t("studio.networkError"))
    }
  }, [researchId, stopPolling, onCompleted])

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

  // Skeleton
  if (!data && !error) {
    return (
      <div className={s.skeleton}>
        <div className={s.skeletonLine} style={{ width: "66%" }} />
        <div className={s.skeletonLine} style={{ width: "40%" }} />
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

    return (
      <div className={s.cardSuccess}>
        <div className={s.header}>
          <span className={s.dotSuccess}><Icon icon="hugeicons:tick-02" /></span>
          <span className={`${s.statusLabel} ${s.textSuccess}`}>
            {data.assetCount !== 1 ? t("studio.foundAssetsPlural").replace("{count}", String(data.assetCount)) : t("studio.foundAssets").replace("{count}", String(data.assetCount))}
          </span>
        </div>

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
      {data.prompt && (
        <p className={s.desc} style={{ paddingLeft: 26 }}>{data.prompt}</p>
      )}
    </div>
  )
}
