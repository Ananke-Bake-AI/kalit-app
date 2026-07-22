"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useParams, useSearchParams } from "next/navigation"
import { useSession } from "next-auth/react"
import { createBrokerClient } from "@kalit/broker-client"
import { StudioShell, useBrokerStudio } from "@kalit/studio-v2"
import { StudioAuthModal } from "@/components/studio-auth-modal"

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

// Draft typed by an anonymous visitor, restored after sign-in (survives the
// OAuth full-page redirect).
const PENDING_PROMPT_KEY = "kalit.studio.pendingPrompt"

export function StudioV2Client({ initialSessionId }: { initialSessionId?: string }) {
  const { data: session, status } = useSession()
  const authed = status === "authenticated"
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

  const meId = (session?.user as { id?: string } | undefined)?.id
  const s = useBrokerStudio(client, lang, wsBaseUrl, meId)
  const user = { name: session?.user?.name || session?.user?.email || "" }

  // Funnel Kimi : le studio est ouvert aux visiteurs anonymes. L'auth
  // n'apparaît (modal) qu'au moment d'ENVOYER un prompt ; le brouillon est
  // conservé et part tout seul après connexion.
  const [authOpen, setAuthOpen] = useState(false)
  const sendRef = useRef(s.send)
  sendRef.current = s.send

  const guardedSend = useCallback((text: string) => {
    if (!authed) {
      try { localStorage.setItem(PENDING_PROMPT_KEY, text) } catch { /* ignore */ }
      setAuthOpen(true)
      return
    }
    sendRef.current(text)
  }, [authed])

  // Reprise post-auth : dès que la session existe, le brouillon en attente
  // part automatiquement (couvre le retour OAuth ET la connexion en modal).
  const didResume = useRef(false)
  useEffect(() => {
    if (!authed || didResume.current) return
    let draft: string | null = null
    try { draft = localStorage.getItem(PENDING_PROMPT_KEY) } catch { /* ignore */ }
    if (!draft?.trim()) return
    didResume.current = true
    try { localStorage.removeItem(PENDING_PROMPT_KEY) } catch { /* ignore */ }
    setAuthOpen(false)
    sendRef.current(draft)
  }, [authed])

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
  // Attend que le statut d'auth soit résolu : un visiteur anonyme avec
  // ?prompt= doit passer par guardedSend (modal), pas par un send qui 401.
  const didPrompt = useRef(false)
  useEffect(() => {
    if (didPrompt.current || initialSessionId || status === "loading") return
    const sess = searchParams?.get("session")
    const p = searchParams?.get("prompt")
    if (!sess && !p?.trim()) return
    didPrompt.current = true
    window.history.replaceState(null, "", `/${lang}/studio`)
    if (sess) {
      s.select(sess)
      if (p?.trim()) guardedSend(p)
    } else {
      guardedSend(p as string)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status])

  // Garde l'URL synchro avec la session active → /studio/<id> partageable et
  // pratique pour debug. replaceState : pas de navigation Next (pas de remount).
  useEffect(() => {
    if (typeof window === "undefined") return
    const want = s.activeId ? `/${lang}/studio/${s.activeId}` : `/${lang}/studio`
    if (window.location.pathname !== want) window.history.replaceState(null, "", want)
  }, [s.activeId, lang])

  return (
    <>
      <StudioShell
        sessions={s.sessions} activeId={s.activeId} messages={s.messages}
        streaming={s.streaming} activity={s.activity} ctxPercent={s.ctxPercent} tree={s.tree} previewUrl={s.previewUrl}
        user={user} meId={meId} model={s.model} modelGroups={s.modelGroups} onModelChange={s.setModel} lang={lang}
        publishUrl={s.publishUrl} publishing={s.publishing} canPublish={s.canPublish} onPublish={s.publish}
        canDownload={s.canDownload} downloading={s.downloading} onDownload={s.download}
        onSelect={s.select} onNew={s.newProject} onDelete={s.deleteSession} onRename={s.renameSession} onSend={guardedSend} onStop={s.stop}
        queued={s.queued} onQueuePrompt={s.enqueuePrompt} onCancelQueued={s.cancelQueued}
        onRefreshTree={s.refreshTree}
        attachments={s.attachments} uploading={s.uploading} onAddFiles={s.addFiles} onRemoveAttachment={s.removeAttachment}
        outOfCredits={s.outOfCredits} checkPromptQuality={s.checkPromptQuality}
        isAdmin={(session?.user as { isAdmin?: boolean } | undefined)?.isAdmin === true}
        precision={s.precision} onPrecisionChange={s.setPrecision}
        deployBlocked={s.deployBlocked} onDismissDeployBlocked={s.dismissDeployBlocked}
        storage={s.storage} storageBlocked={s.storageBlocked} onDismissStorageBlocked={s.dismissStorageBlocked}
        domain={s.domain} onConnectDomain={s.connectDomain} onRemoveDomain={s.removeDomain}
        publishResult={s.publishResult} onClearPublishResult={s.clearPublishResult}
        previewActivity={s.previewActivity}
        onShare={s.shareSession} canShare={s.canShare}
        canShareProject={s.canShareProject} onCreateInvite={s.createInvite} onListInvites={s.listInvites} onRevokeInvite={s.revokeInvite} github={s.github} pendingRepo={s.pendingRepo} setPendingRepo={s.setPendingRepo}
      />
      {authOpen && !authed && (
        <StudioAuthModal
          callbackUrl={`/${lang}/studio`}
          onClose={() => setAuthOpen(false)}
        />
      )}
    </>
  )
}
