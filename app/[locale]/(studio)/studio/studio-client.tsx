"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
import { brokerFetch } from "@/lib/broker-direct"
import { useStudioStore } from "@/stores/studio"
import { useI18n } from "@/stores/i18n"
import { useAppStore } from "@/stores/app"
import { Icon } from "@/components/icon"
import { ChatLayout } from "@/components/studio/chat-layout"
import { SessionSidebar } from "@/components/studio/session-sidebar"
import { ChatInput } from "@/components/studio/chat-input"
import { WelcomeScreen } from "@/components/studio/welcome-screen"
import { MessageList } from "@/components/studio/message-list"
import { FileExplorer } from "@/components/studio/file-explorer"
import { FilePreviewModal } from "@/components/studio/file-preview-modal"
import { RoutingDebugPanel } from "@/components/studio/routing-debug"
import { useStudioFocus } from "@/app/[locale]/(studio)/studio-focus-context"
import type { ChatSession, StreamSegment, UploadedFile } from "@/types/studio"
import type { SuiteId } from "@/lib/suites"
import s from "./studio.module.scss"

const PROGRESS_MODE_KEY = "kalit_studio_progress_mode"

export function StudioClient() {
  const searchParams = useSearchParams()
  const { locale, t } = useI18n()
  const setPage = useAppStore((s) => s.setPage)
  const { focusMode, toggleFocus } = useStudioFocus()

  const {
    sessions,
    setSessions,
    activeSessionId,
    setActiveSessionId,
    messages,
    setMessages,
    setMessagesLoading,
    messagesLoading,
    setPreferredLang,
    isStreaming,
    setSidebarOpen,
    addSession,
    setIsStreaming,
    setStreamSegments,
    setStreamThinking,
    setLastRouting,
    resetStream,
    addMessage,
    setActiveWidgets,
    addActiveWidget,
    setError,
    setQuota,
    previewFile,
    setPreviewFile,
    rightPanelOpen,
    setRightPanelOpen,
    progressMode,
    setProgressMode,
  } = useStudioStore()

  const [ready, setReady] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const [chatPrefill, setChatPrefill] = useState<{ text: string; nonce: number } | null>(null)
  const pendingPromptRef = useRef<string | null>(null)
  const activeSessionRef = useRef<string | null>(activeSessionId)
  const abortRef = useRef<AbortController | null>(null)
  activeSessionRef.current = activeSessionId

  // ── Hydrate progressMode from localStorage ──────────────

  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      const saved = window.localStorage.getItem(PROGRESS_MODE_KEY)
      if (saved === "expert" || saved === "default") {
        setProgressMode(saved)
      }
    } catch {
      // silent
    }
  }, [setProgressMode])

  // ── Sync locale + suite from URL params ─────────────────

  useEffect(() => {
    setPreferredLang(locale)
  }, [locale, setPreferredLang])

  useEffect(() => {
    const suite = searchParams.get("suite") as SuiteId | null
    if (suite) setPage(suite)
  }, [searchParams, setPage])

  // ── Load sessions from broker ───────────────────────────

  useEffect(() => {
    async function loadSessions() {
      try {
        const res = await brokerFetch("/api/broker/sessions")
        if (res.ok) {
          const data = await res.json()
          setSessions(data.sessions || [])
          setReady(true)
        } else {
          setConnectionError(t("studio.brokerError").replace("{status}", String(res.status)))
        }
      } catch (err) {
        setConnectionError(t("studio.connectionError"))
        console.error("[Studio] Broker connection failed:", err)
      }
    }
    loadSessions()
  }, [setSessions])

  // ── Fetch helpers ───────────────────────────────────────

  const fetchMessages = useCallback(async (sessionId: string) => {
    try {
      const res = await brokerFetch(`/api/broker/sessions/${sessionId}/messages`)
      if (res.ok && activeSessionRef.current === sessionId) {
        const data = await res.json()
        setMessages(data.messages || [])
      }
    } catch {
      // silent
    }
  }, [setMessages])

  const fetchSessions = useCallback(async () => {
    try {
      const res = await brokerFetch("/api/broker/sessions")
      if (res.ok) {
        const data = await res.json()
        setSessions(data.sessions || [])
      }
    } catch {
      // silent
    }
  }, [setSessions])

  const fetchQuota = useCallback(async () => {
    try {
      const res = await fetch("/api/broker/usage")
      if (res.ok) {
        const data = await res.json()
        setQuota({
          plan: data.plan,
          creditsPerMonth: data.creditsPerMonth,
          remainingCredits: data.remaining,
          percentage: data.percentage,
        })
      }
    } catch {
      // silent
    }
  }, [setQuota])

  // ── Handle URL session param ────────────────────────────

  useEffect(() => {
    if (!ready) return
    const sessionId = searchParams.get("session")
    const prompt = searchParams.get("prompt")

    if (sessionId) {
      setActiveSessionId(sessionId)
      if (prompt) pendingPromptRef.current = prompt
    }
  }, [ready, searchParams, setActiveSessionId])

  // ── Fetch messages when active session changes ──────────

  useEffect(() => {
    if (!activeSessionId) {
      setMessages([])
      return
    }

    setMessagesLoading(true)
    fetchMessages(activeSessionId).finally(() => {
      if (activeSessionRef.current === activeSessionId) {
        setMessagesLoading(false)
      }
    })
  }, [activeSessionId, setMessages, setMessagesLoading, fetchMessages])

  // ── Auto-send pending prompt ────────────────────────────

  useEffect(() => {
    if (!activeSessionId || messagesLoading || !pendingPromptRef.current) return
    const prompt = pendingPromptRef.current
    pendingPromptRef.current = null
    handleSend(prompt)
  }, [activeSessionId, messagesLoading])

  // ── Session selection ───────────────────────────────────

  const handleSessionSelect = useCallback((id: string) => {
    setActiveSessionId(id)
    const url = new URL(window.location.href)
    url.searchParams.set("session", id)
    url.searchParams.delete("prompt")
    url.searchParams.delete("suite")
    window.history.replaceState(null, "", url.toString())
  }, [setActiveSessionId])

  // ── Welcome prompt click: prefill chat input, don't auto-send ──
  //
  // The user picks a suggestion to seed an enriched starter sentence; they
  // then add their own context before pressing Send. Session is created
  // lazily inside handleSend so empty drafts don't pollute the sidebar.

  const handleWelcomePrompt = useCallback((prompt: string, suiteId?: SuiteId) => {
    if (suiteId) setPage(suiteId)
    setChatPrefill({ text: prompt, nonce: Date.now() })
  }, [setPage])

  // ── Send message with full SSE streaming ────────────────

  const handleSend = useCallback(async (message: string, files?: UploadedFile[]) => {
    if (isStreaming) return

    // Lazy session creation: when the user composes from the welcome screen
    // we don't have an activeSessionId yet. Create one here so empty drafts
    // don't pile up in the sidebar.
    let sessionId = activeSessionId
    if (!sessionId) {
      try {
        const createRes = await brokerFetch("/api/broker/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ model: "minimax-m2.7:cloud" }),
        })
        if (!createRes.ok) {
          setError(t("studio.connectionError"))
          return
        }
        const createData = await createRes.json()
        const session: ChatSession = createData.session
        addSession(session)
        setActiveSessionId(session.id)
        setMessages([])
        sessionId = session.id
        activeSessionRef.current = session.id
        const url = new URL(window.location.href)
        url.searchParams.set("session", session.id)
        url.searchParams.delete("prompt")
        window.history.replaceState(null, "", url.toString())
      } catch {
        setError(t("studio.connectionError"))
        return
      }
    }

    setError(null)
    setIsStreaming(true)
    setStreamSegments([])
    setStreamThinking("")

    const controller = new AbortController()
    abortRef.current = controller

    // Optimistic: add user message
    const tempId = `temp-${Date.now()}`
    addMessage({
      id: tempId,
      role: "user",
      content: message,
      files: files || null,
      createdAt: new Date().toISOString(),
    })

    let streamText = ""
    let watchdog: ReturnType<typeof setInterval> | null = null

    try {
      const body: Record<string, unknown> = {
        message,
        language: locale,
        progressMode,
        requestId: `req-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      }
      if (files && files.length > 0) body.files = files

      const res = await brokerFetch(`/api/broker/sessions/${sessionId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      })

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}))
        setError((data as { error?: string }).error || `Error ${res.status}`)
        setIsStreaming(false)
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""
      let thinking = ""
      const segments: StreamSegment[] = []

      // Watchdog: broker sends `: keepalive\n\n` every 15s. If we go 45s
      // without any bytes (including keepalives), the connection is dead —
      // abort so the finally-block can reload from the broker's persisted
      // state. This catches silent stalls from Next.js rewrites / dev server
      // / proxies that keep the socket open but drop data.
      let lastByteAt = Date.now()
      watchdog = setInterval(() => {
        if (Date.now() - lastByteAt > 45_000) {
          if (watchdog) clearInterval(watchdog)
          watchdog = null
          controller.abort()
        }
      }, 5_000)

      const pushText = (chunk: string) => {
        const last = segments[segments.length - 1]
        if (last?.type === "text") {
          last.content += chunk
        } else {
          segments.push({ type: "text", content: chunk })
        }
        // Mark previous tool as done when new text arrives
        for (let i = segments.length - 2; i >= 0; i--) {
          if (segments[i].type === "tool") {
            ;(segments[i] as { type: "tool"; done: boolean }).done = true
            break
          }
        }
        streamText += chunk
        setStreamSegments([...segments])
      }

      const pushTool = (name: string, input: unknown) => {
        segments.push({ type: "tool", name, input, done: false })
        setStreamSegments([...segments])
      }

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        // Any bytes received (event, keepalive, anything) = connection alive
        lastByteAt = Date.now()

        buffer += decoder.decode(value, { stream: true })
        const parts = buffer.split("\n\n")
        buffer = parts.pop() || ""

        for (const part of parts) {
          for (const line of part.trim().split("\n")) {
            if (!line.startsWith("data: ")) continue
            try {
              const event = JSON.parse(line.slice(6))
              switch (event.type) {
                case "text":
                  if (event.content) pushText(event.content)
                  break

                case "thinking":
                  thinking += event.content || ""
                  setStreamThinking(thinking)
                  break

                case "tool_use":
                  if (event.name) pushTool(event.name, event.input)
                  break

                case "tool_result":
                  // Mark last open tool as done
                  for (let i = segments.length - 1; i >= 0; i--) {
                    if (segments[i].type === "tool" && !(segments[i] as { done: boolean }).done) {
                      ;(segments[i] as { type: "tool"; done: boolean }).done = true
                      break
                    }
                  }
                  setStreamSegments([...segments])
                  break

                case "widget": {
                  const wt = event.widget?.widgetType || event.widgetType
                  const wi = event.widget?.widgetId || event.widgetId
                  if (wt && wi) {
                    // If the same widgetId was already emitted in this stream,
                    // update it in place instead of appending a duplicate card.
                    const existingIdx = segments.findIndex(
                      (s) => s.type === "widget" && s.widgetId === wi,
                    )
                    const widgetSeg = {
                      type: "widget" as const,
                      widgetType: wt,
                      widgetId: wi,
                      status: event.status,
                      assets: event.assets,
                      count: event.count,
                    }
                    if (existingIdx >= 0) {
                      segments[existingIdx] = widgetSeg
                    } else {
                      segments.push(widgetSeg)
                    }
                    setStreamSegments([...segments])
                    addActiveWidget({ type: wt, id: wi })
                  }
                  break
                }

                case "progress": {
                  const lastSeg = segments[segments.length - 1]
                  if (lastSeg?.type === "progress") {
                    lastSeg.messages.push(event.content)
                  } else {
                    segments.push({ type: "progress", messages: [event.content] })
                  }
                  setStreamSegments([...segments])
                  break
                }

                case "file":
                  segments.push({
                    type: "file",
                    name: event.name,
                    mimeType: event.mimeType,
                    url: event.url,
                  })
                  setStreamSegments([...segments])
                  break

                case "error":
                  setError(event.content || t("studio.streamError"))
                  break

                case "suite_selected": {
                  // Broker classifier picked a suite — update the studio logo
                  // and stash routing metadata for the admin debug panel.
                  const payload = event.input as {
                    suite?: string
                    confidence?: string
                    source?: string
                    reasoning?: string
                    latency_ms?: number
                  } | undefined
                  const suite = payload?.suite
                  if (suite && suite !== "helper") {
                    setPage(suite as SuiteId)
                  } else if (suite === "helper") {
                    setPage("default")
                  }
                  if (payload) {
                    setLastRouting({
                      suite: payload.suite || "",
                      confidence: payload.confidence || "",
                      source: payload.source || "",
                      reasoning: payload.reasoning,
                      latencyMs: payload.latency_ms,
                      at: Date.now(),
                    })
                  }
                  break
                }

                case "done":
                  // Handled after loop
                  break
              }
            } catch {
              // skip parse errors
            }
          }
        }
      }

      // Stream finished cleanly — state sync happens in finally so that
      // all termination paths (success, error, abort, dropped connection)
      // reconcile against the broker's persisted state.
    } catch (err) {
      if ((err as Error)?.name !== "AbortError") {
        if (streamText.length > 0) {
          console.warn("[Studio] SSE connection dropped, reloading from broker")
        } else {
          setError(err instanceof Error ? err.message : t("studio.connectionError"))
        }
      }
    } finally {
      if (watchdog) clearInterval(watchdog)
      // Always reload from broker: it persists segments continuously after
      // every event (text, tool, progress…) and keeps processing even if the
      // client disconnects. This guarantees the UI shows the latest saved
      // state regardless of how the stream terminated.
      if (sessionId && activeSessionRef.current === sessionId) {
        setActiveWidgets([])
        try {
          await fetchMessages(sessionId)
        } catch {
          // silent — keep whatever we have
        }
        fetchSessions()
        fetchQuota()
      }
      resetStream()
      abortRef.current = null
    }
  }, [
    activeSessionId, isStreaming, locale, progressMode, addMessage,
    addSession, setActiveSessionId, setMessages, t,
    setError, setIsStreaming, setStreamSegments, setStreamThinking,
    resetStream, setActiveWidgets, addActiveWidget,
    fetchMessages, fetchSessions, fetchQuota,
  ])

  // ── Stop streaming ──────────────────────────────────────

  const handleStop = useCallback(() => {
    abortRef.current?.abort()
    if (activeSessionId) {
      brokerFetch(`/api/broker/cancel/${activeSessionId}`, { method: "POST" }).catch(() => {})
    }
  }, [activeSessionId])

  // ── Toggle sidebar on mobile ────────────────────────────

  const handleMenuToggle = useCallback(() => {
    setSidebarOpen(!useStudioStore.getState().sidebarOpen)
  }, [setSidebarOpen])

  // ── Create a new chat session ───────────────────────────

  const handleNewChat = useCallback(async () => {
    try {
      const res = await brokerFetch("/api/broker/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "minimax-m2.7:cloud" }),
      })
      if (res.ok) {
        const data = await res.json()
        const session: ChatSession = data.session
        addSession(session)
        setActiveSessionId(session.id)
        setMessages([])
        const url = new URL(window.location.href)
        url.searchParams.set("session", session.id)
        url.searchParams.delete("prompt")
        url.searchParams.delete("suite")
        window.history.replaceState(null, "", url.toString())
      }
    } catch {
      // silent
    }
  }, [addSession, setActiveSessionId, setMessages])

  // ── Global keyboard shortcuts ───────────────────────────
  //   ⌘K / Ctrl+K        → focus sidebar search
  //   ⌘⇧O / Ctrl+Shift+O → start a new chat
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey
      if (!meta) return
      if (e.key === "k" || e.key === "K") {
        e.preventDefault()
        window.dispatchEvent(new CustomEvent("kalit:focus-sidebar-search"))
      } else if (e.shiftKey && (e.key === "o" || e.key === "O")) {
        e.preventDefault()
        void handleNewChat()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [handleNewChat])

  // ── Toggle right panel (file explorer) ──────────────────

  const handleRightPanelToggle = useCallback(() => {
    setRightPanelOpen(!rightPanelOpen)
  }, [rightPanelOpen, setRightPanelOpen])

  // ── Preview file handler ────────────────────────────────

  const [previewImages, setPreviewImages] = useState<{ url: string; name: string }[]>([])

  const handlePreviewFile = useCallback(
    (file: { url: string; name: string }, images?: { url: string; name: string }[]) => {
      setPreviewFile(file)
      setPreviewImages(images || [])
    },
    [setPreviewFile],
  )

  // ── Render ──────────────────────────────────────────────

  if (connectionError) {
    return (
      <div className={s.shell}>
        <div className={s.center}>
          <h2>{t("studio.studio")}</h2>
          <p className={s.error}>{connectionError}</p>
          <p className={s.hint}>
            {t("studio.brokerHint")}
          </p>
        </div>
      </div>
    )
  }

  if (!ready) {
    return (
      <div className={s.shell}>
        <div className={s.center}>
          <div className={s.loader} />
          <p>{t("studio.loadingStudio")}</p>
        </div>
      </div>
    )
  }

  const showWelcome = !activeSessionId || (messages.length === 0 && !isStreaming)

  return (
    <ChatLayout
      sidebar={<SessionSidebar onSessionSelect={handleSessionSelect} onNewChat={handleNewChat} />}
      rightPanel={
        activeSessionId ? (
          <FileExplorer sessionId={activeSessionId} onPreviewFile={handlePreviewFile} />
        ) : undefined
      }
    >
      {/* Top bar — branding + session title + right-panel toggle */}
      <div className={s.topBar}>
        <div className={s.topLeft}>
          <button className={s.menuBtn} onClick={handleMenuToggle} title={t("studio.newChat")}>
            <span /><span /><span />
          </button>
          <span className={s.brand}>{t("studio.title")}</span>
        </div>
        {activeSessionId && (
          <span className={s.topTitle}>
            {sessions.find((sess) => sess.id === activeSessionId)?.title || t("studio.newConversation")}
          </span>
        )}
        <div className={s.topRight}>
          <button
            className={s.panelToggle}
            onClick={toggleFocus}
            title={focusMode ? t("studio.exitFocus") : t("studio.focusMode")}
          >
            <Icon icon={focusMode ? "hugeicons:minimize-02" : "hugeicons:maximize-02"} />
          </button>
          {activeSessionId && (
            <button
              className={s.panelToggle}
              onClick={handleRightPanelToggle}
              title={rightPanelOpen ? t("studio.hideFiles") : t("studio.showFiles")}
            >
              <Icon icon={rightPanelOpen ? "hugeicons:sidebar-right" : "hugeicons:source-code"} />
            </button>
          )}
        </div>
      </div>

      {/* Content area */}
      <div className={s.content}>
        {showWelcome ? (
          <WelcomeScreen
            onPromptSelect={handleWelcomePrompt}
            activeSuite={searchParams.get("suite") as SuiteId | null}
          />
        ) : (
          <div className={s.messageArea}>
            {messagesLoading ? (
              <div className={s.center}>
                <div className={s.loader} />
              </div>
            ) : (
              <MessageList
                onStop={handleStop}
                onPreviewFile={handlePreviewFile}
                onRefreshMessages={() => activeSessionId && fetchMessages(activeSessionId)}
              />
            )}
          </div>
        )}
      </div>

      {/* Chat input — always available so users can type from the welcome
          screen; session is created lazily in handleSend on first send. */}
      <ChatInput onSend={handleSend} prefill={chatPrefill} />

      {/* File preview modal */}
      {previewFile && (
        <FilePreviewModal
          url={previewFile.url}
          name={previewFile.name}
          items={previewImages}
          onClose={() => { setPreviewFile(null); setPreviewImages([]) }}
        />
      )}

      <RoutingDebugPanel />
    </ChatLayout>
  )
}
