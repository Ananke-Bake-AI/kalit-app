"use client"

import { useEffect, useMemo, useRef } from "react"
import { useParams, useSearchParams } from "next/navigation"
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

export function StudioV2Client({ initialSessionId }: { initialSessionId?: string }) {
  const { data: session } = useSession()
  const params = useParams()
  const searchParams = useSearchParams()
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

  // Deep-link : sélectionne la session de l'URL au 1er rendu (une seule fois).
  const didInit = useRef(false)
  useEffect(() => {
    if (didInit.current || !initialSessionId) return
    didInit.current = true
    s.select(initialSessionId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSessionId])

  // Entrée par query params (une seule fois), puis nettoyage de l'URL :
  //  • ?prompt=…            (landing / /flow)  → nouvelle session avec ce texte.
  //  • ?session=…           (open depuis discover/profil)  → ouvre cette session.
  //  • ?session=…&prompt=…  (remix)  → ouvre la session forkée + envoie l'idée dedans.
  // Ignoré si un deep-link /studio/<id> est déjà en cours (initialSessionId).
  const didPrompt = useRef(false)
  useEffect(() => {
    if (didPrompt.current || initialSessionId) return
    const sess = searchParams?.get("session")
    const p = searchParams?.get("prompt")
    if (!sess && !p?.trim()) return
    didPrompt.current = true
    window.history.replaceState(null, "", `/${lang}/studio`)
    if (sess) {
      s.select(sess)
      if (p?.trim()) s.send(p)
    } else {
      s.send(p as string)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Garde l'URL synchro avec la session active → /studio/<id> partageable et
  // pratique pour debug. replaceState : pas de navigation Next (pas de remount).
  useEffect(() => {
    if (typeof window === "undefined") return
    const want = s.activeId ? `/${lang}/studio/${s.activeId}` : `/${lang}/studio`
    if (window.location.pathname !== want) window.history.replaceState(null, "", want)
  }, [s.activeId, lang])

  return (
    <StudioShell
      sessions={s.sessions} activeId={s.activeId} messages={s.messages}
      streaming={s.streaming} activity={s.activity} ctxPercent={s.ctxPercent} tree={s.tree} previewUrl={s.previewUrl}
      user={user} model={s.model} onModelChange={s.setModel} lang={lang}
      publishUrl={s.publishUrl} publishing={s.publishing} canPublish={s.canPublish} onPublish={s.publish}
      canDownload={s.canDownload} downloading={s.downloading} onDownload={s.download}
      onSelect={s.select} onNew={s.newProject} onDelete={s.deleteSession} onSend={s.send} onStop={s.stop}
      onRefreshTree={s.refreshTree}
      attachments={s.attachments} uploading={s.uploading} onAddFiles={s.addFiles} onRemoveAttachment={s.removeAttachment}
      outOfCredits={s.outOfCredits}
      deployBlocked={s.deployBlocked} onDismissDeployBlocked={s.dismissDeployBlocked}
      storage={s.storage} storageBlocked={s.storageBlocked} onDismissStorageBlocked={s.dismissStorageBlocked}
      domain={s.domain} onConnectDomain={s.connectDomain} onRemoveDomain={s.removeDomain}
    />
  )
}
