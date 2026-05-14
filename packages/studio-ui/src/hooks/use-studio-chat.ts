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
import type { ChatMessage, ChatSession, UploadedFile } from "../types"
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
    setPreferredLang,
    addSession,
    markSessionProcessing,
    setLastRouting,
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
    // Per-session UI state mutators. Every chat / streaming write
    // targets a specific sessionId so background runs never leak
    // into the visible chat and a session-switch never has to
    // clear/restore the rendered state.
    setSessionMessages,
    setSessionMessagesLoading,
    addSessionMessage,
    removeSessionMessage,
    setSessionIsStreaming,
    setSessionStreamSegments,
    setSessionStreamThinking,
    setSessionActiveWidgets,
    addSessionActiveWidget,
    dropSession,
  } = useStudioStore()
  // Active-session view selectors. Re-render the consumer only when
  // the active session's own state changes — flipping activeSessionId
  // and / or mutating background-session state is silent here.
  const isStreaming = useStudioStore((s) =>
    s.activeSessionId ? s.bySession[s.activeSessionId]?.isStreaming ?? false : false,
  )
  const messagesLoading = useStudioStore((s) =>
    s.activeSessionId
      ? s.bySession[s.activeSessionId]?.messagesLoading ?? false
      : false,
  )

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
        // Write straight into this session's slot in bySession. The
        // active-session selectors pick it up automatically; if the
        // user is currently looking at a different session, their
        // view is untouched and ours gets revealed the moment they
        // switch back — no cache layer, no race, no flash.
        setSessionMessages(sessionId, fresh)
      }
    } catch {
      // silent
    }
  }, [setSessionMessages])

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
  //
  // Critical: this effect does NOT touch the previously-active
  // session's bySession[sid] entry. Switching A → B leaves A's
  // messages, segments, thinking, isStreaming, widgets exactly
  // where they were — and switching back to A re-reveals that
  // state byte-for-byte via the active-session selectors, with
  // no clear/re-fetch/re-mount in between. The visible chat is
  // a pure projection of bySession[activeSessionId].
  //
  // Two things still need to happen here:
  //  1. Optimistically flip B's isStreaming flag if the cached
  //     sessions row says it's busy, so the dots show in the
  //     same frame as the click (instead of waiting 200-500 ms
  //     for the WS session_attached). The WS layer can override
  //     either way once it has a real signal.
  //  2. Kick off a background fetchMessages(B) so we always have
  //     fresh persisted state, even if the WS session_context
  //     hasn't landed yet. The fetch writes straight into
  //     bySession[B].messages — no visible flash because there's
  //     no prior step that emptied the slot.
  useEffect(() => {
    if (!activeSessionId) return
    const targetSession = useStudioStore.getState().sessions.find((s) => s.id === activeSessionId)
    if (targetSession?.isProcessing) {
      setSessionIsStreaming(activeSessionId, true)
    }
    // Only show the loader when we have nothing painted yet.
    // Re-entries to a session we already have rows for stay
    // visible during revalidation.
    const existing = useStudioStore.getState().bySession[activeSessionId]
    if (!existing || existing.messages.length === 0) {
      setSessionMessagesLoading(activeSessionId, true)
    }
    void fetchMessages(activeSessionId).finally(() => {
      setSessionMessagesLoading(activeSessionId, false)
    })
  }, [activeSessionId, setSessionIsStreaming, setSessionMessagesLoading, fetchMessages])

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
  // Sessions for which handleSend is currently driving the SSE body.
  // session_idle from the WS arrives BEFORE the broker opens the
  // streamHub room for a brand-new session (POST /messages races the
  // subscribe), so without this set we'd flip isStreaming=false right
  // after handleSend set it true. The dots vanish, the user thinks
  // nothing's happening. The fix is to suppress session_idle's
  // setIsStreaming(false) while a local POST is in flight for the
  // same session — handleSend owns the flag in that window.
  const inflightSendsRef = useRef<Set<string>>(new Set())

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
          // session_context replaces our REST GET /messages and tells us
          // whether a live agent run is in flight. EVERYTHING here writes
          // straight into bySession[sid] — no "if sid === active" gate
          // because the active-session selectors already pick out only
          // the visible session. A session_context arriving for a
          // background tab fills its slot silently; the user sees no
          // change until they click into it.
          if (!sid) break
          const ctx = frame as unknown as {
            messages?: Array<Record<string, unknown>>
            isLive?: boolean
          }
          const fresh = (Array.isArray(ctx.messages) ? ctx.messages : []) as never as ChatMessage[]
          setSessionMessages(sid, fresh)
          // Capture the partial assistant for pruning when the
          // following `session_attached` fires — keyed per sid so
          // concurrent background sessions don't trample each other.
          for (let i = fresh.length - 1; i >= 0; i--) {
            if (fresh[i].role === "assistant") {
              prunedAssistantRef.current.set(sid, fresh[i].id)
              break
            }
            if (fresh[i].role === "user") break
          }
          if (ctx.isLive) {
            setSessionIsStreaming(sid, true)
          }
          break
        }
        case "session_attached": {
          // Room is live for `sid` — prune its persisted partial
          // assistant message and flip its streaming flag on. Both are
          // per-sid: if the user is on a different session, only the
          // background slot updates.
          if (!sid) break
          const pid = prunedAssistantRef.current.get(sid)
          if (pid) {
            removeSessionMessage(sid, pid)
            prunedAssistantRef.current.delete(sid)
          }
          setSessionIsStreaming(sid, true)
          // The broker confirmed the room is open — the
          // handleSend window is over, session_idle is no longer
          // racing the streamHub setup. Drop the in-flight claim
          // so future session_idle frames can act normally.
          inflightSendsRef.current.delete(sid)
          break
        }
        case "session_idle": {
          // Broker has no live room for `sid`. Clear that session's
          // streaming flag + thinking text — unless a local handleSend
          // is currently driving its POST (broker just hasn't called
          // Open yet; session_idle is racing the streamHub setup).
          if (!sid) break
          if (!inflightSendsRef.current.has(sid)) {
            setSessionIsStreaming(sid, false)
            setSessionStreamThinking(sid, "")
            prunedAssistantRef.current.delete(sid)
          }
          break
        }
        case "session_stream_closed": {
          // Run wrapped up for `sid` — this is the AUTHORITATIVE
          // signal that the broker is done. Everything that used to
          // live in handleSend's finally block lives here now,
          // because Vercel's 60 s streaming-function ceiling means
          // the POST connection often dies long before the agent
          // actually finishes.
          if (!sid) break
          // Refetch the canonical messages first, then clear segments
          // — keeps the live stream visible until the persisted bubble
          // lands so the user doesn't see a one-frame gap.
          void fetchMessages(sid).finally(() => {
            setSessionStreamSegments(sid, [])
            setSessionActiveWidgets(sid, [])
          })
          setSessionIsStreaming(sid, false)
          setSessionStreamThinking(sid, "")
          markSessionProcessing(sid, false)
          inflightSendsRef.current.delete(sid)
          // Sidebar / quota are global — no sid filter needed.
          fetchSessions()
          fetchQuota()
          if (sid === activeSessionRef.current) {
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
          if (!sid) break
          // Any inbound event is proof of life — flip this session's
          // streaming flag back on (idempotent if already true).
          setSessionIsStreaming(sid, true)
          // Get-or-create the reducer for this session. Its callbacks
          // write to bySession[sid] unconditionally — background-
          // session events fill their own slots, the active-session
          // selectors pick up exactly the visible session and ignore
          // the rest.
          let reducer = reducersRef.current.get(sid)
          if (!reducer) {
            reducer = new AgentStreamReducer({
              onSegmentsChanged: (segs) => {
                setSessionStreamSegments(sid, segs)
              },
              onThinkingChanged: (th) => {
                setSessionStreamThinking(sid, th)
              },
              onWidget: ({ type, id }) => {
                addSessionActiveWidget(sid, { type, id })
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
    setLastRouting,
    onSuiteChange,
    setError,
    fetchMessages,
    fetchSessions,
    fetchQuota,
    notify,
    setSessionMessages,
    removeSessionMessage,
    setSessionIsStreaming,
    setSessionStreamSegments,
    setSessionStreamThinking,
    setSessionActiveWidgets,
    addSessionActiveWidget,
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
    // The whole point of the per-session UI state model is that this
    // function does the LEAST possible work — no resetStream, no
    // clearMessages, no setStreamSegments([]). Each session owns its
    // own messages / segments / thinking / isStreaming / widgets
    // inside bySession[sid]; switching activeSessionId is enough to
    // re-reveal the previous session's exact state on return. The
    // active-session selectors swap their backing slot atomically.
    selectedSuiteRef.current = null
    // Wipe the GLOBAL error banner so it doesn't pin to a different
    // chat. (Errors aren't per-session in this store today.)
    setError(null)
    setActiveSessionId(id)
    onSessionActivated?.(id, { clearPrompt: true, clearSuite: true })
  }, [setError, setActiveSessionId, onSessionActivated])

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
      // No need to seed messages — bySession[session.id] starts at
      // the EMPTY_SESSION_STATE sentinel via the selector default.
      activeSessionRef.current = session.id
      onSessionActivated?.(session.id, { clearPrompt: true })
      return session.id
    } catch {
      setError(t("studio.connectionError"))
      return null
    }
  }, [addSession, setActiveSessionId, setError, t, onSessionActivated])

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
    // Per-sid streaming/segments init. We OWN sessionId for this
    // send, so we target its slot directly — even if the user has
    // since clicked another session, we still update bySession[
    // sessionId] correctly. The active-session selectors pick up
    // only the visible one.
    setSessionIsStreaming(sessionId, true)
    setSessionStreamSegments(sessionId, [])
    setSessionStreamThinking(sessionId, "")

    // Mirror the broker-side TryLockSession into the local sessions
    // cache so a later session-switch+return correctly identifies this
    // session as in-flight.
    markSessionProcessing(sessionId, true)
    // Claim this session as "locally sending" so the WS session_idle
    // handler doesn't race us and flip isStreaming back to false
    // while our POST is still opening the broker's streamHub room.
    inflightSendsRef.current.add(sessionId)

    const controller = new AbortController()
    abortRef.current = controller

    const tempId = `temp-${Date.now()}`
    addSessionMessage(sessionId, {
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
          // input flips to its disabled-with-banner state immediately.
          if (res.status === 402) {
            const current = useStudioStore.getState().quota
            if (current) {
              setQuota({ ...current, remainingCredits: 0, percentage: 100 })
            }
            setError(t("studio.outOfCreditsError"))
          } else {
            setError(data.error || `Error ${res.status}`)
          }
        }
        // No run started (auth / credit gate / 400) — roll back the
        // session's optimistic state. session_stream_closed will NOT
        // fire because the broker never opened a room.
        setSessionIsStreaming(sessionId, false)
        removeSessionMessage(sessionId, tempId)
        markSessionProcessing(sessionId, false)
        inflightSendsRef.current.delete(sessionId)
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""

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

      // STREAM CONSUMPTION POLICY: the per-user WS multiplex is the
      // ONLY writer for streamSegments / streamThinking / activeWidgets
      // now. We still drain this POST response body so the broker can
      // flush events without backpressure and so we know when the run
      // ends, but every "case" below is either:
      //   - a side-effect that can't go through the WS bridge
      //     (debug_summary, console logs, optimistic quota decrement,
      //     402 credit gate, suite-change side-effects, notify() on
      //     widget terminal state), OR
      //   - a counter for admin console (textCharCount / toolCount).
      // We do NOT call setStreamSegments / setStreamThinking from here.
      // Two writers were ping-ponging on the same state (POST and WS
      // both see the same events but with different arrival ordering),
      // producing the flicker the user described as "sometimes nothing
      // shows" — sometimes the WS already had segments populated and
      // the slightly-behind POST overwrote them with a shorter list.

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
                    streamText += event.content
                    textCharCount += event.content.length
                    if (textCharCount % 200 < event.content.length) {
                      clog("text", "TEXT", `Streaming... ${textCharCount} chars received`)
                    }
                  }
                  break

                case "thinking":
                  if (event.content) {
                    clog("think", "THINK", "Thinking block started...")
                  }
                  break

                case "tool_use":
                  if (event.name) {
                    toolCount++
                    const inputPreview = event.input ? JSON.stringify(event.input).slice(0, 120) : ""
                    clog("tool", "TOOL", `#${toolCount} ${event.name}(${inputPreview}${inputPreview.length >= 120 ? "..." : ""})`)
                  }
                  break

                case "tool_result":
                  clog("tool", "TOOL", `#${toolCount} completed`)
                  break

                case "widget": {
                  const wt = event.widget?.widgetType || event.widgetType
                  const wi = event.widget?.widgetId || event.widgetId
                  if (wt && wi) {
                    clog("widget", "WIDGET", `${wt} ${wi.slice(0, 8)} status=${event.status || "active"}`)
                    const status = String(event.status || "").toLowerCase()
                    const terminal =
                      status === "completed" || status === "deployed" || status === "failed"
                    if (terminal) notify()
                  }
                  break
                }

                case "progress":
                  clog("progress", "PROG", event.content || "...")
                  break

                case "file":
                  clog("file", "FILE", `${event.name} (${event.mimeType})`)
                  break

                case "error":
                  clog("error", "ERROR", event.content || "Unknown error")
                  // setError stays here — the WS reducer also surfaces
                  // errors, but having both is idempotent (the same
                  // message overwrites itself) and we avoid a race
                  // where WS lags and the user sees "(no message yet)".
                  if (isStill()) setError(event.content || t("studio.streamError"))
                  break

                case "suite_selected": {
                  // Suite side-effects (URL sync, sidebar highlight)
                  // are kept here so they fire even if the WS reducer
                  // hasn't created a per-session reducer yet (the
                  // first session_event creates it). Without this, the
                  // very first turn could land the assistant text
                  // before the suite-route header settled.
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
      // CRITICAL: this block must NOT touch bySession[sessionId].
      // The POST/SSE stream closing does not mean the agent run is
      // over — Vercel kills streaming functions at ~60 s, and the
      // run can keep going on the broker for minutes (Taskforce
      // builds, long find_assets_search batches, wait_for_completion
      // polling). The authoritative "run finished" signal is the
      // WS frame `session_stream_closed`, which already does all
      // the per-session cleanup (fetchMessages, drop reducer, flip
      // isStreaming off, clear segments/thinking, refresh sidebar
      // + quota). Calling those mutators here while the agent is
      // still working is exactly what produced the user-visible
      // "no thinking indicator" bug after a 60 s Taskforce build.
      //
      // We do clear local refs that are scoped to this handler.
      if (watchdog) clearInterval(watchdog)
      abortRef.current = null
      sendingRef.current = false
    }
  }, [
    activeSessionId, isStreaming, locale, progressMode,
    ensureSession, setError, fetchMessages, fetchSessions,
    fetchQuota, notify, addConsoleLog, setConsoleSummary, setConsoleOpen, markSessionProcessing,
    setLastRouting, onSuiteChange, t, enableAdminConsole, setQuota,
    setSessionIsStreaming, setSessionStreamSegments, setSessionStreamThinking,
    setSessionActiveWidgets, addSessionActiveWidget, addSessionMessage, removeSessionMessage,
  ])

  // Keep the ref pointing at the latest handleSend so auto-send effects above
  // always call the freshest closure.
  useEffect(() => {
    handleSendRef.current = handleSend
  }, [handleSend])

  // ── Stop streaming ──────────────────────────────────────

  const handleStop = useCallback(() => {
    abortRef.current?.abort()
    followRef.current?.abort()
    abortRef.current = null
    followRef.current = null

    // Force-reset the ACTIVE session's streaming state immediately
    // so the UI doesn't stay pinned at isStreaming=true forever
    // if the broker cancel silently fails.
    sendingRef.current = false
    if (activeSessionId) {
      setSessionIsStreaming(activeSessionId, false)
      setSessionStreamSegments(activeSessionId, [])
      setSessionStreamThinking(activeSessionId, "")
      markSessionProcessing(activeSessionId, false)
      inflightSendsRef.current.delete(activeSessionId)

      brokerFetch(`/api/broker/cancel/${activeSessionId}`, { method: "POST" }).catch(() => {})

      const widgets =
        useStudioStore.getState().bySession[activeSessionId]?.activeWidgets ?? []
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
  }, [activeSessionId, setSessionIsStreaming, setSessionStreamSegments, setSessionStreamThinking, markSessionProcessing])

  // ── New chat ───────────────────────────────────────────

  const handleNewChat = useCallback(async () => {
    // Lazy session creation: drop activeSessionId to null. The
    // welcome screen renders because there's no active session;
    // bySession entries for OTHER sessions stay intact, so when
    // the user clicks back to a running session their state is
    // exactly where they left it. No global reset, no clearing.
    selectedSuiteRef.current = null
    setError(null)
    followRef.current?.abort()
    followRef.current = null
    setActiveSessionId(null)
    onSessionActivated?.("", { clearPrompt: true, clearSuite: true })
  }, [setActiveSessionId, onSessionActivated, setError])

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
