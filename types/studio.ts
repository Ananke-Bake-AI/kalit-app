// ---------------------------------------------------------------------------
// Studio types — ported from Flow-AI chat interface
// ---------------------------------------------------------------------------

export interface ChatSession {
  id: string
  title: string | null
  model: string
  isProcessing: boolean
  progressMode?: "default" | "expert"
  createdAt: string
  updatedAt: string
}

export interface UploadedFile {
  fileId: string
  name: string
  type: string
  size: number
  url: string
}

export interface ChatMessage {
  id: string
  role: "user" | "assistant" | "system" | "widget"
  content: string
  thinking?: string | null
  tools?: { name: string; input: unknown }[] | null
  files?: UploadedFile[] | null
  widget?: { type: string; id: string } | null
  createdAt: string
}

// SSE stream segment types
export type StreamSegment =
  | { type: "text"; content: string }
  | { type: "tool"; name: string; input: unknown; done: boolean }
  | { type: "widget"; widgetType: string; widgetId: string; status?: string; assets?: string[]; count?: number }
  | { type: "file"; name: string; mimeType: string; url: string }
  | { type: "progress"; messages: string[] }

export interface WidgetPayload {
  type: string
  id: string
}

export interface QuotaInfo {
  plan: string
  creditsPerMonth: number
  remainingCredits: number
  percentage: number
}

export interface AtCommand {
  name: string
  desc: string
  hint: string
}

export interface AtMenuState {
  query: string
  index: number
}

export interface PreviewFile {
  url: string
  name: string
}
