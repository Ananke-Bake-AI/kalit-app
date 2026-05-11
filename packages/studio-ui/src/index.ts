// Public barrel for @kalit/studio-ui.
//
// Hosts (kalit-landing, future Tauri desktop) should at bootstrap:
//   1. call setStudioBrokerClient(client) with a @kalit/broker-client instance
//   2. wrap Studio with <StudioHostProvider value={{ user, navigate, getSearchParam }}>

export {
  setStudioBrokerClient,
  brokerFetch,
  toClientFileUrl,
  toFindAssetsUrl,
  clearBrokerToken,
  setLandingFetchConfig,
  landingFetch,
  StudioHostProvider,
  useStudioHost,
  useStudioUser,
} from "./host"
export type { StudioUser, StudioHostValue, LandingFetchConfig } from "./host"

export { useStudioStore } from "./store"
export type * from "./types"

// Chat surface + widgets
export { ChatInput } from "./components/chat-input"
export { ChatLayout } from "./components/chat-layout"
export { MessageList } from "./components/message-list"
export { MessageBubble } from "./components/message-bubble"
export { SessionSidebar } from "./components/session-sidebar"
export { WelcomeScreen } from "./components/welcome-screen"
export { StreamSegments } from "./components/stream-segments"
export { ModelSelector } from "./components/model-selector"
export { MarkdownLink } from "./components/markdown-link"
export { WidgetRenderer } from "./components/widget-renderer"
export { FileExplorer } from "./components/file-explorer"
export { FilePreviewModal } from "./components/file-preview-modal"
export { ImportRepoModal } from "./components/import-repo-modal"

export {
  ProjectWidget,
  ResearchWidget,
  TaskWidget,
  HotfixWidget,
  RespawnWidget,
  MarketingWidget,
} from "./components/widgets"

// Shared primitives (currently housed here; may move to @kalit/ui later)
export { Icon } from "./primitives/icon"
export { Logo } from "./primitives/logo"

// Contexts (studio-specific, but host-agnostic)
export { StudioFocusProvider, useStudioFocus } from "./contexts/studio-focus-context"
export { StudioThemeProvider, useStudioTheme } from "./contexts/studio-theme-context"

// Shared lib helpers
export {
  dateBucket,
  formatDaySeparator,
  formatRelative,
  formatTime,
  isSameDay,
} from "./lib/format-date"
export type { DateBucket } from "./lib/format-date"
export * from "./lib/suites"
export * from "./lib/stream-consumer"

// Hooks
export {
  readNotificationPrefs,
  writeNotificationPrefs,
  useNotificationSystem,
} from "./hooks/use-notification-system"
export type { NotificationPrefs } from "./hooks/use-notification-system"
export { useStudioChat } from "./hooks/use-studio-chat"
export type {
  UseStudioChatApi,
  UseStudioChatOptions,
  StudioChatParamReader,
  SuiteRouteTarget,
} from "./hooks/use-studio-chat"
