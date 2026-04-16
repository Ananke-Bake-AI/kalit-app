import { create } from "zustand"

import type {
  AtMenuState,
  ChatMessage,
  ChatSession,
  PreviewFile,
  QuotaInfo,
  StreamSegment,
  UploadedFile,
  WidgetPayload,
} from "@/types/studio"

interface StudioStore {
  // Sessions
  sessions: ChatSession[]
  activeSessionId: string | null
  setSessions: (sessions: ChatSession[]) => void
  setActiveSessionId: (id: string | null) => void
  addSession: (session: ChatSession) => void
  removeSession: (id: string) => void
  updateSessionTitle: (id: string, title: string) => void

  // Messages
  messages: ChatMessage[]
  messagesLoading: boolean
  setMessages: (messages: ChatMessage[]) => void
  setMessagesLoading: (loading: boolean) => void
  addMessage: (message: ChatMessage) => void
  removeMessage: (id: string) => void

  // Streaming
  isStreaming: boolean
  streamSegments: StreamSegment[]
  streamThinking: string
  setIsStreaming: (streaming: boolean) => void
  setStreamSegments: (segments: StreamSegment[]) => void
  appendStreamSegment: (segment: StreamSegment) => void
  setStreamThinking: (thinking: string) => void
  resetStream: () => void

  // Active widgets (injected by SSE, persisted across message refreshes)
  activeWidgets: WidgetPayload[]
  setActiveWidgets: (widgets: WidgetPayload[]) => void
  addActiveWidget: (widget: WidgetPayload) => void

  // File attachments
  attachedFiles: UploadedFile[]
  setAttachedFiles: (files: UploadedFile[]) => void
  isUploading: boolean
  setIsUploading: (uploading: boolean) => void

  // Imported git repo for the active session (populated from broker).
  // `url` is always safe to display; the token itself is never surfaced
  // back to the client — `hasToken` is just a flag.
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

  // Error
  error: string | null
  setError: (error: string | null) => void

  // Delete confirmation
  deleteConfirm: string | null
  setDeleteConfirm: (id: string | null) => void

  // Routing debug (admin-only panel) — latest suite_selected event payload.
  // Populated by studio-client's SSE handler on every outgoing message.
  lastRouting: RoutingDebug | null
  setLastRouting: (routing: RoutingDebug | null) => void
}

export interface RoutingDebug {
  suite: string
  confidence: string
  source: string
  reasoning?: string
  latencyMs?: number
  at: number
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

const sameContent = (a: ChatMessage, b: ChatMessage): boolean =>
  a.role === b.role && a.content === b.content

// Drop a temp message when the incoming server list already covers it
// (same role+content). Server messages are the source of truth; only temps
// that have NO server counterpart yet are kept (e.g. POST in-flight).
function mergeMessages(prev: ChatMessage[], next: ChatMessage[]): ChatMessage[] {
  const carriedTemps = prev.filter(
    (m) => isTempId(m.id) && !next.some((n) => sameContent(n, m)),
  )
  return [...next, ...carriedTemps]
}

// Skip an optimistic add when the same id is already present, or when the
// most recent message has the same role+content (rapid double-Enter, or the
// server copy already landed). Non-adjacent matches are allowed so a user
// can legitimately send the same prompt twice later in the conversation.
function shouldSkipAdd(prev: ChatMessage[], msg: ChatMessage): boolean {
  if (prev.some((m) => m.id === msg.id)) return true
  const last = prev[prev.length - 1]
  return !!last && sameContent(last, msg)
}

export const useStudioStore = create<StudioStore>((set) => ({
  // Sessions
  sessions: [],
  activeSessionId: null,
  setSessions: (sessions) => set({ sessions }),
  setActiveSessionId: (activeSessionId) => set({ activeSessionId }),
  addSession: (session) => set((s) => ({ sessions: [session, ...s.sessions] })),
  removeSession: (id) => set((s) => ({ sessions: s.sessions.filter((sess) => sess.id !== id) })),
  updateSessionTitle: (id, title) =>
    set((s) => ({
      sessions: s.sessions.map((sess) => (sess.id === id ? { ...sess, title } : sess)),
    })),

  // Messages
  messages: [],
  messagesLoading: false,
  setMessages: (messages) => set((s) => ({ messages: mergeMessages(s.messages, messages) })),
  setMessagesLoading: (messagesLoading) => set({ messagesLoading }),
  addMessage: (message) =>
    set((s) => (shouldSkipAdd(s.messages, message) ? s : { messages: [...s.messages, message] })),
  removeMessage: (id) =>
    set((s) => ({ messages: s.messages.filter((m) => m.id !== id) })),

  // Streaming
  isStreaming: false,
  streamSegments: [],
  streamThinking: "",
  setIsStreaming: (isStreaming) => set({ isStreaming }),
  setStreamSegments: (streamSegments) => set({ streamSegments }),
  appendStreamSegment: (segment) =>
    set((s) => ({ streamSegments: [...s.streamSegments, segment] })),
  setStreamThinking: (streamThinking) => set({ streamThinking }),
  resetStream: () => set({ isStreaming: false, streamSegments: [], streamThinking: "" }),

  // Active widgets
  activeWidgets: [],
  setActiveWidgets: (activeWidgets) => set({ activeWidgets }),
  addActiveWidget: (widget) =>
    set((s) => {
      if (s.activeWidgets.some((w) => w.id === widget.id && w.type === widget.type)) {
        return s
      }
      return { activeWidgets: [...s.activeWidgets, widget] }
    }),

  // File attachments
  attachedFiles: [],
  setAttachedFiles: (attachedFiles) => set({ attachedFiles }),
  isUploading: false,
  setIsUploading: (isUploading) => set({ isUploading }),

  // Imported repo
  importedRepo: null,
  setImportedRepo: (importedRepo) => set({ importedRepo }),

  // UI state
  sidebarOpen: false,
  rightPanelOpen: false,
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  setRightPanelOpen: (rightPanelOpen) => set({ rightPanelOpen }),

  // @ command menu
  atMenu: null,
  setAtMenu: (atMenu) => set({ atMenu }),

  // Preview
  previewFile: null,
  setPreviewFile: (previewFile) => set({ previewFile }),

  // Quota
  quota: null,
  setQuota: (quota) => set({ quota }),

  // Preferences
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

  // Admin model override
  selectedModel: "minimax-m2.7:cloud",
  setSelectedModel: (selectedModel) => set({ selectedModel }),

  // Error
  error: null,
  setError: (error) => set({ error }),

  // Delete confirmation
  deleteConfirm: null,
  setDeleteConfirm: (deleteConfirm) => set({ deleteConfirm }),

  // Routing debug
  lastRouting: null,
  setLastRouting: (lastRouting) => set({ lastRouting }),
}))
