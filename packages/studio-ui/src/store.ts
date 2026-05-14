import { create } from "zustand"
import { shallow } from "zustand/shallow"

import type {
  AtMenuState,
  ChatMessage,
  ChatSession,
  PreviewFile,
  QuotaInfo,
  StreamSegment,
  UploadedFile,
  WidgetPayload,
} from "./types"

export type TaskforceStandard = "anthropic" | "openai"

// ─────────────────────────────────────────────────────────────
// Session-scoped UI state.
//
// Every piece of chat state that depends on which session is
// currently being viewed lives in `bySession[sid]`. Switching
// sessions is JUST flipping `activeSessionId` — no clearing, no
// resetting, no re-fetching. When the user navigates away and
// comes back, the rendered state is byte-identical to what they
// left behind, because the underlying state was never touched.
//
// Mutations target a specific `sid`. WS events naturally carry
// their session id, so the reducer can update background-session
// state without ever bleeding into the visible chat.
// ─────────────────────────────────────────────────────────────

export interface SessionUIState {
  messages: ChatMessage[]
  messagesLoading: boolean
  streamSegments: StreamSegment[]
  streamThinking: string
  isStreaming: boolean
  activeWidgets: WidgetPayload[]
}

const EMPTY_SESSION_STATE: SessionUIState = {
  messages: [],
  messagesLoading: false,
  streamSegments: [],
  streamThinking: "",
  isStreaming: false,
  activeWidgets: [],
}

// Frozen sentinel returned from selectors when there's no active
// session. Stable reference → Zustand subscribers don't churn.
const EMPTY_MESSAGES: readonly ChatMessage[] = Object.freeze([])
const EMPTY_SEGMENTS: readonly StreamSegment[] = Object.freeze([])
const EMPTY_WIDGETS: readonly WidgetPayload[] = Object.freeze([])

interface StudioStore {
  // Sessions
  sessions: ChatSession[]
  activeSessionId: string | null
  setSessions: (sessions: ChatSession[]) => void
  setActiveSessionId: (id: string | null) => void
  addSession: (session: ChatSession) => void
  removeSession: (id: string) => void
  updateSessionTitle: (id: string, title: string) => void
  markSessionProcessing: (id: string, isProcessing: boolean) => void

  // ──────────────────────────────────────────────────────────
  // Per-session UI state (chat messages + live streaming view).
  // Indexed by sessionId. Components read via the bound selectors
  // (useActiveSessionState, useSessionMessages, …) which key on
  // activeSessionId; mutations always target a specific sid.
  // ──────────────────────────────────────────────────────────
  bySession: Record<string, SessionUIState>
  patchSession: (sid: string, patch: Partial<SessionUIState>) => void
  // Drop a session's entire UI state. Used when the user deletes
  // the session so we don't keep its messages alive in memory.
  dropSession: (sid: string) => void

  // Per-session message mutations. Reads use the SessionUIState
  // selectors below; only writes need explicit setters.
  setSessionMessages: (sid: string, messages: ChatMessage[]) => void
  addSessionMessage: (sid: string, message: ChatMessage) => void
  removeSessionMessage: (sid: string, id: string) => void
  setSessionMessagesLoading: (sid: string, loading: boolean) => void

  // Per-session live-streaming state. The WS reducer writes here as
  // events arrive — for the active session AND for any background
  // sessions the user has visited. Switching back to a session
  // shows its accumulated stream state immediately.
  setSessionStreamSegments: (sid: string, segments: StreamSegment[]) => void
  setSessionStreamThinking: (sid: string, thinking: string) => void
  setSessionIsStreaming: (sid: string, streaming: boolean) => void
  setSessionActiveWidgets: (sid: string, widgets: WidgetPayload[]) => void
  addSessionActiveWidget: (sid: string, widget: WidgetPayload) => void

  // ──────────────────────────────────────────────────────────
  // Global UI state (not session-scoped).
  // ──────────────────────────────────────────────────────────

  // File attachments (active session only; user can't switch sessions
  // mid-upload anyway, the chat-input clears them on send).
  attachedFiles: UploadedFile[]
  setAttachedFiles: (files: UploadedFile[]) => void
  isUploading: boolean
  setIsUploading: (uploading: boolean) => void

  // Imported git repo for the active session (populated from broker).
  // Re-fetched on session activation; not session-scoped because only
  // the visible session needs it.
  importedRepo: ImportedRepoState | null
  setImportedRepo: (repo: ImportedRepoState | null) => void

  // UI state
  sidebarOpen: boolean
  rightPanelOpen: boolean
  setSidebarOpen: (open: boolean) => void
  setRightPanelOpen: (open: boolean) => void

  // @ command menu
  atMenu: AtMenuState | null
  setAtMenu: (menu: AtMenuState | null) => void

  // Preview
  previewFile: PreviewFile | null
  setPreviewFile: (file: PreviewFile | null) => void

  // Quota
  quota: QuotaInfo | null
  setQuota: (quota: QuotaInfo | null) => void

  // Preferences
  progressMode: "default" | "expert"
  setProgressMode: (mode: "default" | "expert") => void
  showToolBadges: boolean
  setShowToolBadges: (show: boolean) => void
  preferredLang: string
  setPreferredLang: (lang: string) => void
  notifyTitle: boolean
  notifySound: boolean
  setNotifyTitle: (on: boolean) => void
  setNotifySound: (on: boolean) => void

  // Admin model override
  selectedModel: string
  setSelectedModel: (model: string) => void
  taskforceStandard: TaskforceStandard
  setTaskforceStandard: (standard: TaskforceStandard) => void

  // Error
  error: string | null
  setError: (error: string | null) => void

  // Delete confirmation
  deleteConfirm: string | null
  setDeleteConfirm: (id: string | null) => void

  // Routing debug (admin-only panel)
  lastRouting: RoutingDebug | null
  setLastRouting: (routing: RoutingDebug | null) => void

  // Debug console (admin-only)
  consoleOpen: boolean
  setConsoleOpen: (open: boolean) => void
  consoleLogs: ConsoleLogEntry[]
  addConsoleLog: (entry: ConsoleLogEntry) => void
  clearConsoleLogs: () => void
  consoleSummary: ConsoleSummary | null
  setConsoleSummary: (summary: ConsoleSummary | null) => void
}

export interface RoutingDebug {
  suite: string
  confidence: string
  source: string
  reasoning?: string
  latencyMs?: number
  at: number
}

export interface ConsoleLogEntry {
  id: string
  ts: number
  type: string
  tag: string
  message: string
}

export interface ConsoleSummary {
  model: string
  inputTokens: number
  outputTokens: number
  cacheCreationTokens: number
  cacheReadTokens: number
  costCredits: number
  turnDurationMs: number
  segmentsCount: number
}

export interface ImportedRepoState {
  url: string
  username: string | null
  branch: string | null
  hasToken: boolean
}

// Optimistic adds use `temp-…` ids; the broker assigns its own id when the
// message is persisted. Without dedup, both can end up in the list — once as
// the temp and again from the next refresh — producing the visible duplicate.
const isTempId = (id: string): boolean => id.startsWith("temp-")

// Broker may normalize whitespace (trim, \r\n → \n) before persisting, so the
// temp's raw content can differ from the server copy by a few chars. Compare
// trimmed + normalized to keep dedup robust.
const normalize = (s: string): string => s.replace(/\r\n/g, "\n").trim()

const sameContent = (a: ChatMessage, b: ChatMessage): boolean =>
  a.role === b.role && normalize(a.content) === normalize(b.content)

// Drop a temp message when the incoming server list already covers it
// (same role+content). Server messages are the source of truth; only temps
// that have NO server counterpart yet are kept (e.g. POST in-flight).
//
// The returned list is sorted by `createdAt` ASC so a surviving temp lands
// in chronological position instead of after newer server messages.
function mergeMessages(prev: readonly ChatMessage[], next: readonly ChatMessage[]): ChatMessage[] {
  const carriedTemps = prev.filter(
    (m) => isTempId(m.id) && !next.some((n) => sameContent(n, m)),
  )
  const merged = [...next, ...carriedTemps]
  merged.sort((a, b) => {
    const ta = new Date(a.createdAt).getTime()
    const tb = new Date(b.createdAt).getTime()
    if (Number.isNaN(ta) || Number.isNaN(tb)) return 0
    return ta - tb
  })
  return merged
}

// Skip an optimistic add when the same id is already present, or when the
// most recent message has the same role+content (rapid double-Enter, or the
// server copy already landed).
function shouldSkipAdd(prev: readonly ChatMessage[], msg: ChatMessage): boolean {
  if (prev.some((m) => m.id === msg.id)) return true
  const last = prev[prev.length - 1]
  return !!last && sameContent(last, msg)
}

export const useStudioStore = create<StudioStore>((set, get) => ({
  // ── Sessions ──
  sessions: [],
  activeSessionId: null,
  setSessions: (sessions) => set({ sessions }),
  setActiveSessionId: (activeSessionId) => set({ activeSessionId }),
  addSession: (session) => set((s) => ({ sessions: [session, ...s.sessions] })),
  removeSession: (id) =>
    set((s) => ({
      sessions: s.sessions.filter((sess) => sess.id !== id),
    })),
  updateSessionTitle: (id, title) =>
    set((s) => ({
      sessions: s.sessions.map((sess) => (sess.id === id ? { ...sess, title } : sess)),
    })),
  markSessionProcessing: (id, isProcessing) =>
    set((s) => ({
      sessions: s.sessions.map((sess) =>
        sess.id === id ? { ...sess, isProcessing } : sess,
      ),
    })),

  // ── Per-session UI state ──
  bySession: {},
  patchSession: (sid, patch) =>
    set((s) => {
      if (!sid) return s
      const prev = s.bySession[sid] ?? EMPTY_SESSION_STATE
      return {
        bySession: {
          ...s.bySession,
          [sid]: { ...prev, ...patch },
        },
      }
    }),
  dropSession: (sid) =>
    set((s) => {
      if (!sid || !s.bySession[sid]) return s
      const { [sid]: _drop, ...rest } = s.bySession
      return { bySession: rest }
    }),

  setSessionMessages: (sid, messages) =>
    set((s) => {
      if (!sid) return s
      const prev = s.bySession[sid] ?? EMPTY_SESSION_STATE
      // Hard guard: refuse to overwrite a populated chat with an empty
      // list. Empty payloads always come from transient hiccups
      // (broker GET error fallthrough, partial session_context after
      // a fresh WS subscribe, DB read that errored and returned []).
      // The next authoritative refresh will fill it; this protects
      // the painted chat from being wiped between two valid frames.
      // For a legitimately empty session, prev.messages is also empty
      // so mergeMessages produces [] either way — no-op.
      if (messages.length === 0 && prev.messages.length > 0) return s
      const merged = mergeMessages(prev.messages, messages)
      return {
        bySession: {
          ...s.bySession,
          [sid]: { ...prev, messages: merged },
        },
      }
    }),
  addSessionMessage: (sid, message) =>
    set((s) => {
      if (!sid) return s
      const prev = s.bySession[sid] ?? EMPTY_SESSION_STATE
      if (shouldSkipAdd(prev.messages, message)) return s
      return {
        bySession: {
          ...s.bySession,
          [sid]: { ...prev, messages: [...prev.messages, message] },
        },
      }
    }),
  removeSessionMessage: (sid, id) =>
    set((s) => {
      if (!sid) return s
      const prev = s.bySession[sid]
      if (!prev) return s
      return {
        bySession: {
          ...s.bySession,
          [sid]: { ...prev, messages: prev.messages.filter((m) => m.id !== id) },
        },
      }
    }),
  setSessionMessagesLoading: (sid, loading) =>
    set((s) => {
      if (!sid) return s
      const prev = s.bySession[sid] ?? EMPTY_SESSION_STATE
      if (prev.messagesLoading === loading) return s
      return {
        bySession: {
          ...s.bySession,
          [sid]: { ...prev, messagesLoading: loading },
        },
      }
    }),

  setSessionStreamSegments: (sid, streamSegments) =>
    set((s) => {
      if (!sid) return s
      const prev = s.bySession[sid] ?? EMPTY_SESSION_STATE
      return {
        bySession: {
          ...s.bySession,
          [sid]: { ...prev, streamSegments },
        },
      }
    }),
  setSessionStreamThinking: (sid, streamThinking) =>
    set((s) => {
      if (!sid) return s
      const prev = s.bySession[sid] ?? EMPTY_SESSION_STATE
      if (prev.streamThinking === streamThinking) return s
      return {
        bySession: {
          ...s.bySession,
          [sid]: { ...prev, streamThinking },
        },
      }
    }),
  setSessionIsStreaming: (sid, isStreaming) =>
    set((s) => {
      if (!sid) return s
      const prev = s.bySession[sid] ?? EMPTY_SESSION_STATE
      if (prev.isStreaming === isStreaming) return s
      return {
        bySession: {
          ...s.bySession,
          [sid]: { ...prev, isStreaming },
        },
      }
    }),
  setSessionActiveWidgets: (sid, widgets) =>
    set((s) => {
      if (!sid) return s
      const prev = s.bySession[sid] ?? EMPTY_SESSION_STATE
      return {
        bySession: {
          ...s.bySession,
          [sid]: { ...prev, activeWidgets: widgets },
        },
      }
    }),
  addSessionActiveWidget: (sid, widget) =>
    set((s) => {
      if (!sid) return s
      const prev = s.bySession[sid] ?? EMPTY_SESSION_STATE
      if (prev.activeWidgets.some((w) => w.id === widget.id && w.type === widget.type)) {
        return s
      }
      return {
        bySession: {
          ...s.bySession,
          [sid]: { ...prev, activeWidgets: [...prev.activeWidgets, widget] },
        },
      }
    }),

  // ── Global non-session-scoped state ──
  attachedFiles: [],
  setAttachedFiles: (attachedFiles) => set({ attachedFiles }),
  isUploading: false,
  setIsUploading: (isUploading) => set({ isUploading }),

  importedRepo: null,
  setImportedRepo: (importedRepo) => set({ importedRepo }),

  sidebarOpen: false,
  rightPanelOpen: true,
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  setRightPanelOpen: (rightPanelOpen) => set({ rightPanelOpen }),

  atMenu: null,
  setAtMenu: (atMenu) => set({ atMenu }),

  previewFile: null,
  setPreviewFile: (previewFile) => set({ previewFile }),

  quota: null,
  setQuota: (quota) => set({ quota }),

  progressMode: "default",
  setProgressMode: (progressMode) => set({ progressMode }),
  showToolBadges: false,
  setShowToolBadges: (showToolBadges) => set({ showToolBadges }),
  preferredLang: "en",
  setPreferredLang: (preferredLang) => set({ preferredLang }),
  notifyTitle: true,
  notifySound: false,
  setNotifyTitle: (notifyTitle) => set({ notifyTitle }),
  setNotifySound: (notifySound) => set({ notifySound }),

  selectedModel: "anthropic:claude-haiku-4-5-20251001",
  setSelectedModel: (selectedModel) => set({ selectedModel }),
  taskforceStandard: "anthropic",
  setTaskforceStandard: (taskforceStandard) => set({ taskforceStandard }),

  error: null,
  setError: (error) => set({ error }),

  deleteConfirm: null,
  setDeleteConfirm: (deleteConfirm) => set({ deleteConfirm }),

  lastRouting: null,
  setLastRouting: (lastRouting) => set({ lastRouting }),

  consoleOpen: false,
  setConsoleOpen: (consoleOpen) => set({ consoleOpen }),
  consoleLogs: [],
  addConsoleLog: (entry) =>
    set((s) => ({ consoleLogs: [...s.consoleLogs.slice(-500), entry] })),
  clearConsoleLogs: () => set({ consoleLogs: [] }),
  consoleSummary: null,
  setConsoleSummary: (consoleSummary) => set({ consoleSummary }),
}))

// ─────────────────────────────────────────────────────────────
// Selectors bound to the active session.
//
// Components use these instead of reading `messages` /
// `isStreaming` / etc. directly. They auto-subscribe to changes
// of the active session's state and ignore mutations on other
// sessions — so a background agent run in session B doesn't
// re-render the chat for session A.
// ─────────────────────────────────────────────────────────────

export function useActiveSessionState(): SessionUIState {
  return useStudioStore((s) => {
    if (!s.activeSessionId) return EMPTY_SESSION_STATE
    return s.bySession[s.activeSessionId] ?? EMPTY_SESSION_STATE
  })
}

export function useActiveMessages(): readonly ChatMessage[] {
  return useStudioStore((s) =>
    s.activeSessionId ? s.bySession[s.activeSessionId]?.messages ?? EMPTY_MESSAGES : EMPTY_MESSAGES,
  )
}

export function useActiveMessagesLoading(): boolean {
  return useStudioStore((s) =>
    s.activeSessionId ? s.bySession[s.activeSessionId]?.messagesLoading ?? false : false,
  )
}

export function useActiveStreamSegments(): readonly StreamSegment[] {
  return useStudioStore((s) =>
    s.activeSessionId
      ? s.bySession[s.activeSessionId]?.streamSegments ?? EMPTY_SEGMENTS
      : EMPTY_SEGMENTS,
  )
}

export function useActiveStreamThinking(): string {
  return useStudioStore((s) =>
    s.activeSessionId ? s.bySession[s.activeSessionId]?.streamThinking ?? "" : "",
  )
}

export function useActiveIsStreaming(): boolean {
  return useStudioStore((s) =>
    s.activeSessionId ? s.bySession[s.activeSessionId]?.isStreaming ?? false : false,
  )
}

export function useActiveWidgets(): readonly WidgetPayload[] {
  return useStudioStore((s) =>
    s.activeSessionId
      ? s.bySession[s.activeSessionId]?.activeWidgets ?? EMPTY_WIDGETS
      : EMPTY_WIDGETS,
  )
}

// Re-export shallow for consumers that want to opt into shallow
// comparison on multi-field selectors.
export { shallow }
