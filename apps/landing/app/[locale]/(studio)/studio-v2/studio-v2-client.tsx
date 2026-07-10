"use client"

import { useMemo } from "react"
import { useParams } from "next/navigation"
import { useSession } from "next-auth/react"
import { createBrokerClient } from "@kalit/broker-client"
import { StudioShell, useBrokerStudio } from "@kalit/studio-v2"

// Token: NextAuth (/api/broker/token) en prod. En dev, un ?devtoken=<jwt> permet
// de tester sans login (Google OAuth ne marche pas sur localhost).
async function resolveToken(): Promise<string | null> {
  try {
    const r = await fetch("/api/broker/token")
    if (r.ok) { const d = await r.json(); if (d?.token) return d.token }
  } catch { /* ignore */ }
  if (process.env.NODE_ENV !== "production" && typeof window !== "undefined") {
    const dev = new URLSearchParams(window.location.search).get("devtoken")
    if (dev) return dev
  }
  return null
}

export function StudioV2Client() {
  const { data: session } = useSession()
  const params = useParams()
  const lang = (Array.isArray(params?.locale) ? params?.locale[0] : params?.locale) || "en"
  const wsBaseUrl = process.env.NEXT_PUBLIC_BROKER_URL || "https://broker-api.kalit.ai"

  const client = useMemo(() => createBrokerClient({
    baseUrl: "",
    wsBaseUrl,
    getToken: resolveToken,
    fileUrlPrefix: { from: "/api/flow/", to: "/api/broker/" },
  }), [wsBaseUrl])

  const s = useBrokerStudio(client, lang, wsBaseUrl)
  const user = { name: session?.user?.name || session?.user?.email || "" }

  return (
    <StudioShell
      sessions={s.sessions} activeId={s.activeId} messages={s.messages}
      streaming={s.streaming} activity={s.activity} tree={s.tree} previewUrl={s.previewUrl}
      user={user} model={s.model} onModelChange={s.setModel} lang={lang}
      publishUrl={s.publishUrl} publishing={s.publishing} canPublish={s.canPublish} onPublish={s.publish}
      onSelect={s.select} onNew={s.newProject} onSend={s.send} onStop={s.stop}
      onRefreshTree={s.refreshTree}
      attachments={s.attachments} uploading={s.uploading} onAddFiles={s.addFiles} onRemoveAttachment={s.removeAttachment}
    />
  )
}
