/**
 * Shared Studio chat orchestration.
 *
 * One hook drives the entire chat experience (session CRUD, SSE streaming,
 * reconnect on remount, keyboard shortcuts, admin console logs) so landing,
 * desktop and mobile consume a single implementation.
 *
 * Platform-specific bits (URL sync, suite routing, research auto-send) come in
 * as optional callbacks — when a host doesn't implement one, the behavior is
 * simply skipped.
 */

"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { brokerFetch } from "../host"
import { useStudioStore } from "../store"
import {
  readNotificationPrefs,
  useNotificationSystem,
  writeNotificationPrefs,
} from "./use-notification-system"
import { AgentStreamReducer } from "../lib/stream-consumer"
import type { SuiteId } from "../lib/suites"
import type { ChatMessage, ChatSession, StreamSegment, UploadedFile } from "../types"
import { useStudioSocket, type StudioSocketFrame } from "./use-studio-socket"

const PROGRESS_MODE_KEY = "kalit_studio_progress_mode"

export type SuiteRouteTarget = SuiteId | "default"

export interface StudioChatParamReader {
  (key: "session" | "prompt" | "suite" | "researchId"): string | null
}

export interface UseStudioChatOptions {
  locale: string
  t: (key: string) => string
  /**
   * Called when the broker emits `suite_selected` so the host can update its
   * suite highlight (landing: `setPage`; desktop/mobile: no-op).
   */
  onSuiteChange?: (suite: SuiteRouteTarget) => void
  /**
   * Called right after a session becomes active so the host can sync its URL
   * or native deep link. Landing uses `history.replaceState`; desktop skips.
   */
  onSessionActivated?: (
    sessionId: string,
    opts: { clearPrompt?: boolean; clearSuite?: boolean },
  ) => void
  /**
   * Read an initial URL/search param. Landing routes via `useSearchParams`;
   * desktop returns null.
   */
  getInitialParam?: StudioChatParamReader
  /** Landing-only: honor `?researchId=` → fetch prompt + auto-send. */
  enableResearchAutoSend?: boolean
  /**
   * Emit the admin debug console logs (/console command, routing events,
   * debug_summary). Admin-only surfaces enable it; non-admin hosts leave off.
   */
  enableAdminConsole?: boolean
}

export interface UseStudioChatApi {
  ready: boolean
  connectionError: string | null
  chatPrefill: { text: string; nonce: number } | null
  setChatPrefill: (v: { text: string; nonce: number } | null) => void
  notifyMode: "off" | "title" | "titleSound"
  handleSend: (message: string, files?: UploadedFile[]) => Promise<void>
  handleStop: () => void
  handleSessionSelect: (id: string) => void
  handleNewChat: () => Promise<void>
  handleWelcomePrompt: (prompt: string, suiteId?: SuiteId) => void
  handleCycleNotify: () => void
  ensureSession: () => Promise<string | null>
  fetchMessages: (sessionId: string) => Promise<void>
}

export function useStudioChat(options: UseStudioChatOptions): UseStudioChatApi {
  const {
    locale,
    t,
    onSuiteChange,
    onSessionActivated,
    getInitialParam,
    enableResearchAutoSend = false,
    enableAdminConsole = false,
  } = options

  const {
    sessions,
    setSessions,
    activeSessionId,
    setActiveSessionId,
    messagesLoading,
    setMessages,
    clearMessages,
    setMessagesLoading,
    setPreferredLang,
    isStreaming,
    addSession,
    markSessionProcessing,
    setIsStreaming,
    setStreamSegments,
    setStreamThinking,
    setLastRouting,
    resetStream,
    addMessage,
    removeMessage,
    setActiveWidgets,
    addActiveWidget,
    setError,
    setQuota,
    progressMode,
    setProgressMode,
    notifyTitle,
    notifySound,
    setNotifyTitle,
    setNotifySound,
    setImportedRepo,
    addConsoleLog,
    setConsoleSummary,
    setConsoleOpen,
  } = useStudioStore()

  const [ready, setReady] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const [chatPrefill, setChatPrefill] = useState<{ text: string; nonce: number } | null>(null)

  const pendingPromptRef = useRef<string | null>(null)
  const activeSessionRef = useRef<string | null>(activeSessionId)
  const abortRef = useRef<AbortController | null>(null)
  const followRef = useRef<AbortController | null>(null)
  const lastEventIdRef = useRef<number>(0)
  const sendingRef = useRef(false)
  const selectedSuiteRef = useRef<SuiteId | null>(null)
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

  // ── Notification system (title flash + optional chime) ──

  useEffect(() => {
    const prefs = readNotificationPrefs()
    setNotifyTitle(prefs.titleEnabled)
    setNotifySound(prefs.soundEnabled)
  }, [setNotifyTitle, setNotifySound])

  const notifyPrefsRef = useRef({ titleEnabled: notifyTitle, soundEnabled: notifySound })
  notifyPrefsRef.current = { titleEnabled: notifyTitle, soundEnabled: notifySound }
  const { notify } = useNotificationSystem(notifyPrefsRef)

  // ── Sync locale + initial suite ─────────────────────────

  useEffect(() => {
    setPreferredLang(locale)
  }, [locale, setPreferredLang])

  useEffect(() => {
    const suite = getInitialParam?.("suite") as SuiteId | null
    if (suite) {
      selectedSuiteRef.current = suite
      onSuiteChange?.(suite)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
  }, [setSessions, t])

  // ── Fetch helpers ───────────────────────────────────────

  const fetchMessages = useCallback(async (sessionId: string) => {
    try {
      const res = await brokerFetch(`/api/broker/sessions/${sessionId}/messages`)
      if (res.ok) {
        const data = await res.json()
        const fresh = data.messages || []
        // Always populate the cross-session cache, even if the
        // active session changed during the fetch. A user that
        // swaps A→B→A within 2 seconds gets A's messages cached
        // when the original fetch lands, ready for the re-entry.
        useStudioStore.getState().cacheSessionMessages(sessionId, fresh)
        if (activeSessionRef.current === sessionId) {
          setMessages(fresh)
        }
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
      const res = await brokerFetch("/api/broker/usage")
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

  // ── Bootstrap quota on mount so the sidebar badge is visible
  //     immediately, not only after the first chat completes.
  useEffect(() => {
    if (ready) fetchQuota()
  }, [ready, fetchQuota])

  // ── Honor initial `?session=` / `?prompt=` params ───────

  useEffect(() => {
    if (!ready) return
    const sessionId = getInitialParam?.("session") ?? null
    const prompt = getInitialParam?.("prompt") ?? null
    if (sessionId) {
      setActiveSessionId(sessionId)
      if (prompt) pendingPromptRef.current = prompt
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready])

  // ── Fetch messages when active session changes ──────────

  useEffect(() => {
    if (!activeSessionId) {
      clearMessages()
      return
    }
    // Per-session cache hit → render INSTANTLY from the cached
    // snapshot. Switching back to a recently-visited session
    // skips the fetch round-trip and the loader flash entirely;
    // the WS still revalidates the cached view in the background
    // via `session_context`.
    //
    // Cache miss → hard-clear and show the loader; the upcoming
    // fetchMessages / WS session_context will fill it.
    const cached = useStudioStore.getState().getCachedSessionMessages(activeSessionId)
    if (cached && cached.length > 0) {
      // Hard-clear first (drops any optimistic temp from the
      // previous session) THEN set the cached snapshot. Doing it
      // in one set call would race with mergeMessages and re-pull
      // a stale temp from the previous session.
      clearMessages()
      setMessages(cached)
      setMessagesLoading(false)
    } else {
      // No cache — same dance as before (hard-clear + loader),
      // mergeMessages's user-temp leak protection is the reason
      // for clearMessages over setMessages([]).
      clearMessages()
      setMessagesLoading(true)
    }

    // Optimistic streaming flip on session activation. Covers ALL
    // entry paths to a session: sidebar click (handleSessionSelect
    // already flips this, but this is the safety net for the click),
    // page reload on /studio?session=<id>, and shared-link nav. The
    // follow-stream useEffect that fires below keeps `isStreaming=true`
    // when it `onAttached`s; if `onIdle` fires (the broker has no live
    // room — DB flag was stale), it resets the flag itself. Without
    // this flip, returning to an actively-processing session showed
    // the chat with no thinking dots until /api/broker/.../stream
    // attached (200-500 ms), and the user thought the agent had
    // stopped.
    const targetSession = useStudioStore.getState().sessions.find((s) => s.id === activeSessionId)
    if (targetSession?.isProcessing) {
      setIsStreaming(true)
    }

    fetchMessages(activeSessionId).finally(() => {
      if (activeSessionRef.current === activeSessionId) {
        setMessagesLoading(false)
      }
    })
  }, [activeSessionId, clearMessages, setMessages, setMessagesLoading, setIsStreaming, fetchMessages])

  // ── Hydrate imported repo state for the active session ──

  useEffect(() => {
    if (!activeSessionId) {
      setImportedRepo(null)
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const res = await brokerFetch(`/api/broker/sessions/${activeSessionId}/attach-repo`)
        if (!res.ok) return
        const data = (await res.json().catch(() => ({}))) as {
          attached?: boolean
          url?: string
          username?: string
          branch?: string
          hasToken?: boolean
        }
        if (cancelled) return
        if (data?.attached && data.url) {
          setImportedRepo({
            url: data.url,
            username: data.username || null,
            branch: data.branch || null,
            hasToken: !!data.hasToken,
          })
        } else {
          setImportedRepo(null)
        }
      } catch {
        // silent
      }
    })()
    return () => {
      cancelled = true
    }
  }, [activeSessionId, setImportedRepo])

  // handleSend is a circular ref (used below in the auto-send effects),
  // so we close over the latest version via a ref.
  const handleSendRef = useRef<(message: string, files?: UploadedFile[]) => Promise<void>>(
    async () => {},
  )

  // ── Auto-send pending prompt (URL `?prompt=…` flow) ─────

  useEffect(() => {
    if (!activeSessionId || messagesLoading || !pendingPromptRef.current) return
    const prompt = pendingPromptRef.current
    pendingPromptRef.current = null
    handleSendRef.current(prompt)
  }, [activeSessionId, messagesLoading])

  // ── Research auto-send (landing only) ───────────────────

  const researchFiredRef = useRef(false)
  useEffect(() => {
    if (!enableResearchAutoSend) return
    if (!ready || researchFiredRef.current) return
    const researchId = getInitialParam?.("researchId") ?? null
    if (!researchId) return
    researchFiredRef.current = true
    ;(async () => {
      try {
        const res = await fetch(`/api/broker/research/${researchId}/prompt`)
        if (!res.ok) return
        const data = await res.json()
        if (data?.prompt) {
          const suite = data.studioSuite as SuiteId | undefined
          if (suite) {
            selectedSuiteRef.current = suite
            onSuiteChange?.(suite)
          }
          handleSendRef.current(data.prompt)
        }
      } catch {
        // silent
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, enableResearchAutoSend])

  // ── Resume live stream on reconnect ─────────────────────
  //
  // Used to gate this on `sessions.find(id).isProcessing`, but a page
  // reload mid-thinking kills the original POST /messages connection
  // → broker's defer fires UnlockSession → is_processing flips to
  // false in DB, even though the agent.Run goroutine keeps going and
  // the streamHub room is still buffering events. Local cache then
  // reads is_processing=false and the reconnect was skipped, leaving
  // the user staring at no-thinking-no-output until the run finally
  // terminated.
  //
  // The broker's /stream endpoint already tells us whether there's a
  // live room: it returns `{"type":"idle"}` and closes when none
  // exists, `{"type":"attached"}` then streams when one does. So we
  // attempt unconditionally and let the broker decide. The onIdle
  // callback closes the controller cleanly when there's nothing to
  // follow — the cheap probe replaces a guard that was wrong half
  // the time.

  // ── Single-socket transport ─────────────────────────────
  //
  // useStudioSocket owns ONE WebSocket against /api/flow/user-ws
  // multiplexing events for every session the user has open. We
  // route inbound frames into the existing setStreamSegments /
  // setStreamThinking / setActiveWidgets pipeline through the
  // shared AgentStreamReducer (same logic the legacy SSE consumer
  // uses). Replaces the per-session GET /stream + EventSource
  // patchwork with one durable, auto-reconnecting connection.
  const socket = useStudioSocket()
  // Per-session reducer cache so events for sessionA don't pollute
  // sessionB's segments when the user has both subscribed.
  const reducersRef = useRef<Map<string, AgentStreamReducer>>(new Map())
  // Subscriptions we currently hold (kept in sync with socket-level
  // subs, used to drop subs we no longer need on session switch).
  const wsSubsRef = useRef<Set<string>>(new Set())
  // Per-session candidate-to-prune assistant id. Captured the moment
  // we subscribe; flushed when `session_attached` fires (only if
  // the room is actually live — otherwise the persisted partial
  // stays as is, no flicker).
  const prunedAssistantRef = useRef<Map<string, string>>(new Map())

  // Subscribe / unsubscribe to the active session's WS stream.
  // The candidate-to-prune capture used to live here too — but local
  // `messages` is empty at this point (handleSessionSelect just cleared
  // it), so the capture caught nothing. Moved into the session_context
  // handler below where we have the fresh server snapshot.
  useEffect(() => {
    if (!activeSessionId) return
    socket.subscribe(activeSessionId)
    wsSubsRef.current.add(activeSessionId)

    // Re-emit the existing reducer's segments + thinking for this
    // session, if any. Without this, switching back to a session whose
    // agent is still mid-stream leaves the UI blank until the NEXT
    // event arrives (could be 10+ seconds during a tool call). The
    // reducer holds the full accumulated state from the streamHub
    // replay we got the first time we subscribed; emit() pushes it
    // straight into setStreamSegments / setStreamThinking so the user
    // sees the current frame the moment they click the session.
    const reducer = reducersRef.current.get(activeSessionId)
    if (reducer) {
      reducer.emit()
    }

    return () => {
      // We DON'T unsubscribe on session switch — keeping live subs
      // open across sessions is the whole point of the multiplexed
      // socket (lets the sidebar show "new message" badges from
      // other sessions later). Only unsubscribe on hard cleanup
      // (component unmount via the socket's own dispose path).
    }
  }, [activeSessionId, socket])

  // Mount the WS frame router once. The reducer per session takes
  // care of every event the SSE consumer used to handle.
  useEffect(() => {
    const off = socket.onMessage((frame: StudioSocketFrame) => {
      const sid = (frame.sessionId as string) || ""
      switch (frame.type) {
        case "session_context": {
          // session_context replaces our REST GET /messages: the
          // server sent persisted messages + repo state + cursor.
          // We ALWAYS cache the result (lets background sessions
          // pre-populate their entries when the WS attaches a fresh
          // subscription), and only paint the visible chat when the
          // sid matches activeSession.
          const ctx = frame as unknown as {
            messages?: Array<Record<string, unknown>>
            isLive?: boolean
          }
          const fresh = (Array.isArray(ctx.messages) ? ctx.messages : []) as never as ChatMessage[]
          if (sid) {
            useStudioStore.getState().cacheSessionMessages(sid, fresh)
            if (sid === activeSessionRef.current) {
              setMessages(fresh)
              // Capture the partial assistant for pruning when the
              // following `session_attached` fires. Used to live in the
              // subscribe useEffect but local messages was empty at
              // that point (handleSessionSelect had just cleared it),
              // so the capture caught nothing and the persisted partial
              // double-rendered alongside the live reducer segments.
              for (let i = fresh.length - 1; i >= 0; i--) {
                if (fresh[i].role === "assistant") {
                  prunedAssistantRef.current.set(sid, fresh[i].id)
                  break
                }
                if (fresh[i].role === "user") break
              }
              // Optimistic streaming flip the moment the broker tells
              // us a live room exists. Without this, the dots / partial
              // segments don't show until the first session_event
              // arrives (which can lag several hundred ms behind
              // session_context when the broker is busy), and the user
              // perceives the chat as "frozen" right after switching
              // into an active session.
              if (ctx.isLive) {
                setIsStreaming(true)
              }
            }
          }
          break
        }
        case "session_attached": {
          // Room is live — commit the optimistic streaming UI now
          // and prune the persisted partial assistant message so the
          // replayed segments don't double-render.
          if (sid === activeSessionRef.current) {
            const pid = prunedAssistantRef.current.get(sid)
            if (pid) {
              removeMessage(pid)
              prunedAssistantRef.current.delete(sid)
            }
            setIsStreaming(true)
          }
          break
        }
        case "session_idle": {
          // Broker has no live room — clear any optimistic
          // isStreaming we set in handleSessionSelect.
          if (sid === activeSessionRef.current) {
            setIsStreaming(false)
            setStreamThinking("")
            prunedAssistantRef.current.delete(sid)
          }
          break
        }
        case "session_stream_closed": {
          // Run wrapped up. Refetch the canonical messages list +
          // sessions list (for title/usage updates) + quota.
          if (sid === activeSessionRef.current) {
            setActiveWidgets([])
            void fetchMessages(sid)
            fetchSessions()
            fetchQuota()
            setIsStreaming(false)
            setStreamThinking("")
            notify()
          }
          // Drop the reducer; a fresh subscribe later will create a
          // new one (e.g. on session re-activation).
          reducersRef.current.delete(sid)
          break
        }
        case "session_event": {
          const ev = (frame.data ?? {}) as Record<string, unknown>
          if (!ev || typeof ev !== "object") break
          // Get-or-create the reducer for this session, with handlers
          // that ONLY commit to the global UI state when the event
          // belongs to the currently-active session. Events from
          // background sessions (other tabs of the multiplex) still
          // advance their local reducer's segments cache, but don't
          // affect the visible chat.
          let reducer = reducersRef.current.get(sid)
          if (!reducer) {
            reducer = new AgentStreamReducer({
              onSegmentsChanged: (segs) => {
                if (sid === activeSessionRef.current) setStreamSegments(segs)
              },
              onThinkingChanged: (th) => {
                if (sid === activeSessionRef.current) setStreamThinking(th)
              },
              onWidget: ({ type, id }) => {
                if (sid === activeSessionRef.current) addActiveWidget({ type, id })
              },
              onSuiteSelected: (payload) => {
                if (sid !== activeSessionRef.current) return
                const suite = payload?.suite
                if (suite && suite !== "helper") {
                  selectedSuiteRef.current = suite as SuiteId
                  onSuiteChange?.(suite as SuiteId)
                } else if (suite === "helper") {
                  selectedSuiteRef.current = null
                  onSuiteChange?.("default")
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
              },
              onError: (msg) => {
                if (sid === activeSessionRef.current) setError(msg)
              },
            })
            reducersRef.current.set(sid, reducer)
          }
          reducer.apply(ev as Parameters<typeof reducer.apply>[0])
          break
        }
        default:
          break
      }
    })
    return off
  }, [
    socket,
    setMessages,
    setStreamSegments,
    setStreamThinking,
    setIsStreaming,
    setActiveWidgets,
    addActiveWidget,
    setLastRouting,
    onSuiteChange,
    setError,
    fetchMessages,
    fetchSessions,
    fetchQuota,
    notify,
    removeMessage,
  ])

  // SSE follow-stream removed (P8): the per-user WS multiplex is the
  // single transport for live agent events. The legacy GET /api/broker/
  // sessions/{id}/stream endpoint is still served by the broker for
  // non-browser clients (mobile capacitor, CLI tooling) but the studio
  // never opens it anymore. If the WS connection ever fails to attach,
  // useStudioSocket logs to console and retries with exponential
  // backoff — there's no silent fallback.

  // ── Session selection ───────────────────────────────────

  const handleSessionSelect = useCallback((id: string) => {
    if (id === activeSessionRef.current) return
    // Clear residual stream UI from the previous session before switching.
    // Without this, segments / thinking text / live widgets from the old
    // session's in-flight agent stream remain visible on top of the new
    // session's chat until its own follow-stream useEffect kicks in.
    resetStream()
    setActiveWidgets([])
    selectedSuiteRef.current = null
    // Wipe any error banner from the previous session — without this the
    // user sees a stale error pinned over a brand-new conversation.
    setError(null)
    // Clear messages synchronously here, before setActiveSessionId. The
    // activeSessionId effect will also clear+refetch, but it runs
    // post-render — so without this call there's a one-render-cycle
    // gap where activeSessionId points to B but messages[] still holds
    // A's content. Users perceived this as "A's messages flash inside
    // B" right before the loader takes over. Doing it synchronously
    // here collapses the flash into a single loader-then-data
    // transition. Also set messagesLoading=true so the message list
    // shows the loader immediately instead of an empty list.
    clearMessages()
    setMessagesLoading(true)

    // Optimistic streaming flip: if the target session is flagged as
    // currently processing on the broker side (we have `isProcessing`
    // from /api/broker/sessions cached in the store), set `isStreaming`
    // true RIGHT NOW so the dots/thinking indicator renders in the
    // same frame as the session switch. Without this the user clicked
    // a busy session, saw "no thinking icon" for the 200-500 ms the
    // follow-stream effect needed to fetch + connect + `onAttached`,
    // and felt the UI was unresponsive. The follow-stream useEffect
    // keeps `isStreaming=true` when it `onAttached`s (no flicker), and
    // resets it via `onIdle` if it turns out the broker has no live
    // room (rare race where the DB flag is stale).
    const targetSession = useStudioStore.getState().sessions.find((s) => s.id === id)
    if (targetSession?.isProcessing) {
      setIsStreaming(true)
    }

    // Abort the SSE follow-subscription only. We DO NOT abort the
    // in-flight POST /messages (abortRef): doing so triggers the
    // broker's defer to UnlockSession, which flips is_processing back
    // to false locally on completion — and the follow-stream effect
    // then skips the reconnect when the user comes back to the still-
    // working session. Better to let the POST run to completion in the
    // background; isStill() guards inside handleSend prevent its
    // events from leaking into the new session's UI.
    followRef.current?.abort()
    followRef.current = null
    setActiveSessionId(id)
    onSessionActivated?.(id, { clearPrompt: true, clearSuite: true })
  }, [resetStream, setActiveWidgets, setError, clearMessages, setMessagesLoading, setIsStreaming, setActiveSessionId, onSessionActivated])

  // ── Welcome prompt click ────────────────────────────────

  const handleWelcomePrompt = useCallback((prompt: string, suiteId?: SuiteId) => {
    if (suiteId) {
      selectedSuiteRef.current = suiteId
      onSuiteChange?.(suiteId)
    }
    setChatPrefill({ text: prompt, nonce: Date.now() })
  }, [onSuiteChange])

  // ── Lazy session creation ───────────────────────────────

  const ensureSession = useCallback(async (): Promise<string | null> => {
    if (activeSessionRef.current) return activeSessionRef.current
    try {
      const { selectedModel, taskforceStandard } = useStudioStore.getState()
      const createRes = await brokerFetch("/api/broker/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: selectedModel, taskforceModelProvider: taskforceStandard }),
      })
      if (!createRes.ok) {
        setError(t("studio.connectionError"))
        return null
      }
      const createData = await createRes.json()
      const session: ChatSession = createData.session
      addSession(session)
      setActiveSessionId(session.id)
      setMessages([])
      activeSessionRef.current = session.id
      onSessionActivated?.(session.id, { clearPrompt: true })
      return session.id
    } catch {
      setError(t("studio.connectionError"))
      return null
    }
  }, [addSession, setActiveSessionId, setMessages, setError, t, onSessionActivated])

  // ── Send message with full SSE streaming ────────────────

  const handleSend = useCallback(async (message: string, files?: UploadedFile[]) => {
    if (isStreaming) return

    // Admin command: /console toggles the debug console
    if (enableAdminConsole && message.trim() === "/console") {
      setConsoleOpen(!useStudioStore.getState().consoleOpen)
      return
    }

    let sessionId = activeSessionId
    if (!sessionId) {
      sessionId = await ensureSession()
      if (!sessionId) return
    }

    // Capture the originating sessionId so every state mutation below
    // can be gated against `activeSessionRef.current`. Without these
    // guards, a long-running stream we kicked off in session A keeps
    // pushing into setStreamSegments / setError after the user switches
    // to session B — which is what produced the cross-session message
    // bleed and the persistent error banner. The send sets the per-call
    // sessionId once; refs read live state on every event.
    const startSessionId = sessionId
    const isStill = () => activeSessionRef.current === startSessionId

    sendingRef.current = true
    followRef.current?.abort()
    followRef.current = null
    lastEventIdRef.current = 0

    setError(null)
    setIsStreaming(true)
    setStreamSegments([])
    setStreamThinking("")

    // Mirror the broker-side TryLockSession into the local sessions
    // cache so a later session-switch+return correctly identifies this
    // session as in-flight. Without this, `sessions.find(id).isProcessing`
    // is read from a stale snapshot taken at page-load (false), and the
    // follow-stream useEffect's `if (!session?.isProcessing) return`
    // guard kills the reconnect — that's why thinking icons disappeared
    // when the user switched away mid-stream and came back.
    markSessionProcessing(sessionId, true)

    const controller = new AbortController()
    abortRef.current = controller

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
        taskforceModelProvider: useStudioStore.getState().taskforceStandard,
        requestId: `req-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      }
      if (selectedSuiteRef.current) body.suite = selectedSuiteRef.current
      if (files && files.length > 0) body.files = files

      const res = await brokerFetch(`/api/broker/sessions/${sessionId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      })

      if (!res.ok || !res.body) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string
          message?: string
          remainingCredits?: number
        }
        if (isStill()) {
          // 402 = broker credit gate. Snap the local quota to 0 so the
          // input flips to its disabled-with-banner state immediately,
          // surface a localized error rather than the raw "Error 402"
          // we'd otherwise get from the fallback branch.
          if (res.status === 402) {
            const current = useStudioStore.getState().quota
            if (current) {
              setQuota({ ...current, remainingCredits: 0, percentage: 100 })
            }
            setError(t("studio.outOfCreditsError"))
          } else {
            setError(data.error || `Error ${res.status}`)
          }
          setIsStreaming(false)
          removeMessage(tempId)
        }
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""
      let thinking = ""
      const segments: StreamSegment[] = []

      let lastByteAt = Date.now()
      watchdog = setInterval(() => {
        if (Date.now() - lastByteAt > 45_000) {
          if (watchdog) clearInterval(watchdog)
          watchdog = null
          controller.abort()
        }
      }, 5_000)

      let textCharCount = 0
      let toolCount = 0
      const clog = (type: string, tag: string, msg: string) => {
        if (!enableAdminConsole) return
        addConsoleLog({
          id: `ev-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          ts: Date.now(),
          type,
          tag,
          message: msg,
        })
      }

      const pushText = (chunk: string) => {
        const last = segments[segments.length - 1]
        if (last?.type === "text") {
          last.content += chunk
        } else {
          segments.push({ type: "text", content: chunk })
        }
        for (let i = segments.length - 2; i >= 0; i--) {
          if (segments[i].type === "tool") {
            ;(segments[i] as { type: "tool"; done: boolean }).done = true
            break
          }
        }
        streamText += chunk
        if (isStill()) setStreamSegments([...segments])
      }

      const pushTool = (name: string, input: unknown) => {
        segments.push({ type: "tool", name, input, done: false })
        if (isStill()) setStreamSegments([...segments])
      }

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
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
                  if (event.content) {
                    pushText(event.content)
                    textCharCount += event.content.length
                    if (textCharCount % 200 < event.content.length) {
                      clog("text", "TEXT", `Streaming... ${textCharCount} chars received`)
                    }
                  }
                  break

                case "thinking":
                  thinking += event.content || ""
                  if (isStill()) setStreamThinking(thinking)
                  if (thinking.length <= (event.content?.length || 0)) {
                    clog("think", "THINK", "Thinking block started...")
                  }
                  break

                case "tool_use":
                  if (event.name) {
                    pushTool(event.name, event.input)
                    toolCount++
                    const inputPreview = event.input ? JSON.stringify(event.input).slice(0, 120) : ""
                    clog("tool", "TOOL", `#${toolCount} ${event.name}(${inputPreview}${inputPreview.length >= 120 ? "..." : ""})`)
                  }
                  break

                case "tool_result":
                  for (let i = segments.length - 1; i >= 0; i--) {
                    if (segments[i].type === "tool" && !(segments[i] as { done: boolean }).done) {
                      ;(segments[i] as { type: "tool"; done: boolean }).done = true
                      clog("tool", "TOOL", `#${toolCount} completed`)
                      break
                    }
                  }
                  if (isStill()) setStreamSegments([...segments])
                  break

                case "widget": {
                  const wt = event.widget?.widgetType || event.widgetType
                  const wi = event.widget?.widgetId || event.widgetId
                  if (wt && wi) {
                    clog("widget", "WIDGET", `${wt} ${wi.slice(0, 8)} status=${event.status || "active"}`)
                    const existingIdx = segments.findIndex(
                      (seg) => seg.type === "widget" && seg.widgetId === wi,
                    )
                    const prevStatus =
                      existingIdx >= 0
                        ? (segments[existingIdx] as { status?: string }).status
                        : undefined
                    const widgetSeg: StreamSegment = {
                      type: "widget",
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
                    if (isStill()) {
                      setStreamSegments([...segments])
                      addActiveWidget({ type: wt, id: wi })
                    }

                    const status = String(event.status || "").toLowerCase()
                    const terminal =
                      status === "completed" || status === "deployed" || status === "failed"
                    if (terminal && prevStatus !== event.status) notify()
                  }
                  break
                }

                case "progress": {
                  clog("progress", "PROG", event.content || "...")
                  const lastSeg = segments[segments.length - 1]
                  if (lastSeg?.type === "progress") {
                    lastSeg.messages.push(event.content)
                  } else {
                    segments.push({ type: "progress", messages: [event.content] })
                  }
                  if (isStill()) setStreamSegments([...segments])
                  break
                }

                case "file":
                  clog("file", "FILE", `${event.name} (${event.mimeType})`)
                  segments.push({
                    type: "file",
                    name: event.name,
                    mimeType: event.mimeType,
                    url: event.url,
                  })
                  if (isStill()) setStreamSegments([...segments])
                  break

                case "error":
                  clog("error", "ERROR", event.content || "Unknown error")
                  if (isStill()) setError(event.content || t("studio.streamError"))
                  break

                case "suite_selected": {
                  const payload = event.input as {
                    suite?: string
                    confidence?: string
                    source?: string
                    reasoning?: string
                    latency_ms?: number
                  } | undefined
                  const suite = payload?.suite
                  if (suite && suite !== "helper") {
                    selectedSuiteRef.current = suite as SuiteId
                    onSuiteChange?.(suite as SuiteId)
                  } else if (suite === "helper") {
                    selectedSuiteRef.current = null
                    onSuiteChange?.("default")
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
                    const latStr = payload.latency_ms !== undefined ? ` latency=${payload.latency_ms}ms` : ""
                    clog("route", "ROUTE", `suite=${payload.suite} confidence=${payload.confidence} source=${payload.source}${latStr}`)
                    if (payload.reasoning) clog("route", "ROUTE", `reason: ${payload.reasoning}`)
                  }
                  break
                }

                case "debug_summary": {
                  const ds = event as {
                    model?: string
                    input_tokens?: number
                    output_tokens?: number
                    cache_creation_tokens?: number
                    cache_read_tokens?: number
                    cost_credits?: number
                    turn_duration_ms?: number
                    segments_count?: number
                  }
                  setConsoleSummary({
                    model: ds.model || "",
                    inputTokens: ds.input_tokens || 0,
                    outputTokens: ds.output_tokens || 0,
                    cacheCreationTokens: ds.cache_creation_tokens || 0,
                    cacheReadTokens: ds.cache_read_tokens || 0,
                    costCredits: ds.cost_credits || 0,
                    turnDurationMs: ds.turn_duration_ms || 0,
                    segmentsCount: ds.segments_count || 0,
                  })
                  const inTok = ds.input_tokens || 0
                  const outTok = ds.output_tokens || 0
                  const cost = ds.cost_credits || 0
                  const dur = ((ds.turn_duration_ms || 0) / 1000).toFixed(1)
                  clog("cost", "COST", `in=${inTok} out=${outTok} cost=${cost.toFixed(4)} credits turn=${dur}s model=${ds.model || "?"}`)
                  // Optimistic quota decrement: apply this turn's cost
                  // immediately so the sidebar badge ticks down without
                  // waiting for the post-stream fetchQuota() HTTP round-trip.
                  // The final fetchQuota() in the `finally` reconciles drift.
                  if (cost > 0) {
                    const current = useStudioStore.getState().quota
                    if (current) {
                      const remaining = Math.max(0, current.remainingCredits - cost)
                      const percentage = current.creditsPerMonth > 0
                        ? Math.min(100, ((current.creditsPerMonth - remaining) / current.creditsPerMonth) * 100)
                        : current.percentage
                      setQuota({ ...current, remainingCredits: remaining, percentage })
                    }
                  }
                  break
                }

                case "done":
                  clog("done", "DONE", `Stream completed — ${textCharCount} chars, ${toolCount} tools`)
                  break
              }
            } catch {
              // skip parse errors
            }
          }
        }
      }
    } catch (err) {
      if ((err as Error)?.name !== "AbortError") {
        if (streamText.length > 0) {
          console.warn("[Studio] SSE connection dropped, reloading from broker")
        } else if (isStill()) {
          setError(err instanceof Error ? err.message : t("studio.connectionError"))
        }
      }
    } finally {
      if (watchdog) clearInterval(watchdog)
      // Cleanup is gated on isStill — if the user switched away mid-stream,
      // the new session owns the UI and we must NOT touch its widgets,
      // streaming flags, or trigger a setIsStreaming(false) that would
      // disable a still-active stream in the new session.
      const stillActive = isStill()
      if (stillActive && sessionId) {
        setActiveWidgets([])
        try { await fetchMessages(sessionId) } catch { /* silent */ }
        // Guarantee the optimistic temp is gone. mergeMessages drops temps that
        // match a server message, but if content normalization still diverges
        // (attachments, whitespace edge cases) the temp could linger as a
        // duplicate bubble. Force-remove by id as a final safety net.
        removeMessage(tempId)
        fetchSessions()
        fetchQuota()
      }
      // Mirror the broker-side UnlockSession in the local cache so the
      // session no longer reports as processing once the stream is done.
      // Safe to call regardless of which session is active — it keys on
      // the originating sessionId, not the current view.
      if (sessionId) markSessionProcessing(sessionId, false)
      // Drop the live flags but leave streamSegments populated; the
      // typewriter drains the buffered text and clears segments via its
      // onCaughtUp callback. Avoids the persisted bubble snapping in with
      // the full text the moment the broker's stream closes.
      if (stillActive) {
        setIsStreaming(false)
        setStreamThinking("")
      }
      // abortRef/sendingRef are non-render flags scoped to the in-flight
      // send — clear them unconditionally so we don't get stuck.
      abortRef.current = null
      sendingRef.current = false
      if (stillActive) notify()
    }
  }, [
    activeSessionId, isStreaming, locale, progressMode, addMessage, removeMessage,
    ensureSession, setError, setIsStreaming, setStreamSegments, setStreamThinking,
    resetStream, setActiveWidgets, addActiveWidget, fetchMessages, fetchSessions,
    fetchQuota, notify, addConsoleLog, setConsoleSummary, setConsoleOpen, markSessionProcessing,
    setLastRouting, onSuiteChange, t, enableAdminConsole,
  ])

  // Keep the ref pointing at the latest handleSend so auto-send effects above
  // always call the freshest closure.
  useEffect(() => {
    handleSendRef.current = handleSend
  }, [handleSend])

  // ── Stop streaming ──────────────────────────────────────

  const handleStop = useCallback(() => {
    // Abort the client-side fetch + follow-stream subscription regardless
    // of whether the broker cancel succeeds.
    abortRef.current?.abort()
    followRef.current?.abort()
    abortRef.current = null
    followRef.current = null

    // Force-reset the local streaming state IMMEDIATELY. Previously we
    // only reset in handleSend's finally block — if the broker cancel
    // failed silently (.catch noop) and no SSE error came back, the UI
    // stayed pinned at isStreaming=true forever and the user couldn't
    // send a new message (the `if (isStreaming) return` guard at the top
    // of handleSend rejected every attempt). The audit's lacuna #12.
    resetStream()
    sendingRef.current = false
    if (activeSessionId) {
      markSessionProcessing(activeSessionId, false)

      brokerFetch(`/api/broker/cancel/${activeSessionId}`, { method: "POST" }).catch(() => {})

      const widgets = useStudioStore.getState().activeWidgets
      for (const w of widgets) {
        if (w.type === "task" || w.type === "sub-agent") {
          brokerFetch(`/api/broker/task/${w.id}/cancel`, { method: "POST" }).catch(() => {})
        }
        if (w.type === "research" || w.type === "find-assets") {
          brokerFetch(`/api/broker/research/${w.id}/cancel`, { method: "POST" }).catch(() => {})
        }
        if (w.type === "project") {
          brokerFetch(`/api/broker/project/${w.id}/cancel`, { method: "POST" }).catch(() => {})
        }
      }
    }
  }, [activeSessionId, resetStream, markSessionProcessing])

  // ── New chat ───────────────────────────────────────────

  const handleNewChat = useCallback(async () => {
    // Lazy session creation. Previously this fired POST /sessions
    // unconditionally, creating an empty session in the DB even when
    // the user had typed nothing — every "New Chat" click left a
    // ghost session in the sidebar. Now we just reset the UI to the
    // welcome state. The actual session is created on the first
    // outgoing action (handleSend → ensureSession, or uploadFiles →
    // ensureSession).
    //
    // Cleanup of the previous session's residual stream UI mirrors
    // handleSessionSelect — without it, clicking New Chat while a
    // session is mid-stream leaves segments / thinking / widgets /
    // error visible on the empty welcome screen.
    resetStream()
    setActiveWidgets([])
    selectedSuiteRef.current = null
    setError(null)
    followRef.current?.abort()
    followRef.current = null
    clearMessages()
    setMessagesLoading(false)
    setActiveSessionId(null)
    onSessionActivated?.("", { clearPrompt: true, clearSuite: true })
  }, [
    setActiveSessionId, onSessionActivated,
    resetStream, setActiveWidgets, setError, clearMessages, setMessagesLoading,
  ])

  // ── Global keyboard shortcuts ───────────────────────────

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
      } else if (enableAdminConsole && e.shiftKey && (e.key === "d" || e.key === "D")) {
        e.preventDefault()
        setConsoleOpen(!useStudioStore.getState().consoleOpen)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [handleNewChat, setConsoleOpen, enableAdminConsole])

  // ── Notification mode cycle (off → title → titleSound) ──

  const notifyMode = useMemo<"off" | "title" | "titleSound">(() => {
    if (!notifyTitle && !notifySound) return "off"
    if (notifyTitle && notifySound) return "titleSound"
    return "title"
  }, [notifyTitle, notifySound])

  const handleCycleNotify = useCallback(() => {
    const next =
      notifyMode === "off"
        ? { titleEnabled: true, soundEnabled: false }
        : notifyMode === "title"
          ? { titleEnabled: true, soundEnabled: true }
          : { titleEnabled: false, soundEnabled: false }
    setNotifyTitle(next.titleEnabled)
    setNotifySound(next.soundEnabled)
    writeNotificationPrefs(next)
  }, [notifyMode, setNotifyTitle, setNotifySound])

  return {
    ready,
    connectionError,
    chatPrefill,
    setChatPrefill,
    notifyMode,
    handleSend,
    handleStop,
    handleSessionSelect,
    handleNewChat,
    handleWelcomePrompt,
    handleCycleNotify,
    ensureSession,
    fetchMessages,
  }
}
