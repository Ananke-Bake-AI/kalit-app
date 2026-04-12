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

  // Messages
  messages: ChatMessage[]
  messagesLoading: boolean
  setMessages: (messages: ChatMessage[]) => void
  setMessagesLoading: (loading: boolean) => void
  addMessage: (message: ChatMessage) => void

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

  // Error
  error: string | null
  setError: (error: string | null) => void

  // Delete confirmation
  deleteConfirm: string | null
  setDeleteConfirm: (id: string | null) => void
}

export const useStudioStore = create<StudioStore>((set) => ({
  // Sessions
  sessions: [],
  activeSessionId: null,
  setSessions: (sessions) => set({ sessions }),
  setActiveSessionId: (activeSessionId) => set({ activeSessionId }),
  addSession: (session) => set((s) => ({ sessions: [session, ...s.sessions] })),
  removeSession: (id) => set((s) => ({ sessions: s.sessions.filter((sess) => sess.id !== id) })),

  // Messages
  messages: [],
  messagesLoading: false,
  setMessages: (messages) => set({ messages }),
  setMessagesLoading: (messagesLoading) => set({ messagesLoading }),
  addMessage: (message) => set((s) => ({ messages: [...s.messages, message] })),

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
  addActiveWidget: (widget) => set((s) => ({ activeWidgets: [...s.activeWidgets, widget] })),

  // File attachments
  attachedFiles: [],
  setAttachedFiles: (attachedFiles) => set({ attachedFiles }),
  isUploading: false,
  setIsUploading: (isUploading) => set({ isUploading }),

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

  // Error
  error: null,
  setError: (error) => set({ error }),

  // Delete confirmation
  deleteConfirm: null,
  setDeleteConfirm: (deleteConfirm) => set({ deleteConfirm }),
}))
