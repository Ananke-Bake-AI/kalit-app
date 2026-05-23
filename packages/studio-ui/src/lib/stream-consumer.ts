/**
 * Shared SSE consumer for the broker's agent event stream.
 *
 * Used by two paths that render the same in-progress assistant bubble:
 *   1. `POST /messages`: the originating client receives the agent's events
 *      live, in the same HTTP response body.
 *   2. `GET /stream`: a reconnecting client (tab re-opened, network blip,
 *      proxy cut) attaches to the broker's per-session StreamHub, replaying
 *      events since `lastEventId` then following live.
 *
 * Both paths use identical event framing (SSE `id: N\ndata: {JSON}\n\n`) and
 * carry identical event schemas, so UI reducer logic is shared here.
 */
import type { StreamSegment } from "../types"
import type { SuiteId } from "./suites"

/** Everything callers need to share with this consumer. */
export interface StreamConsumerHandlers {
  /** Per-event id from the SSE `id:` line — caller tracks it for reconnect. */
  onEventId?: (id: number) => void
  /** Called on every non-stream-control event so the UI updates. */
  onSegmentsChanged: (segments: StreamSegment[]) => void
  onThinkingChanged: (thinking: string) => void
  onWidget: (payload: { type: string; id: string }) => void
  onSuiteSelected: (payload: SuitePayload) => void
  /** Called when the broker signals error inside the stream. */
  onError: (message: string) => void
  /** Called on terminal `stream_closed` from the /stream endpoint. */
  onStreamClosed?: () => void
  /** Called on `idle` when /stream finds nothing to attach to. */
  onIdle?: () => void
  /** Called on `attached` after /stream hooks the session's StreamHub. */
  onAttached?: (lastSeen: number) => void
}

export interface SuitePayload {
  suite?: string
  confidence?: string
  source?: string
  reasoning?: string
  latency_ms?: number
}

export interface ConsumeOptions {
  /** Used to abort the fetch — existing consumer signal. */
  signal?: AbortSignal
  /** Called on stream bytes received — for watchdog reset. */
  onBytes?: () => void
  /** Initial segments to start from (reconnect replays into an empty UI). */
  initialSegments?: StreamSegment[]
}

type RawEvent = {
  type?: string
  content?: string
  name?: string
  input?: unknown
  widget?: { widgetType?: string; widgetId?: string } | null
  widgetType?: string
  widgetId?: string
  status?: string
  assets?: string[]
  count?: number
  mimeType?: string
  url?: string
  lastSeen?: number
  // ask_choice (QCM) payload — broker sends nested under `choice`. Inline
  // fields (question, options, etc.) appear when the persisted segment is
  // replayed via /stream (the broker copies them to top level for legacy
  // schema compatibility).
  choice?: {
    question?: string
    options?: { label?: string; description?: string }[]
    multi_select?: boolean
    freeform?: boolean
  } | null
  question?: string
  options?: { label?: string; description?: string }[]
  multi_select?: boolean
  freeform?: boolean
}

/**
 * AgentStreamReducer holds the mutating segments + thinking state
 * that both the SSE consumer and the WS bridge share. Each call to
 * `apply(event)` mutates the local arrays AND fires the right
 * handler callback. Returns `"terminal"` when the event represents a
 * stream end (`idle` / `stream_closed`) so the caller can stop
 * pumping; `"continue"` otherwise.
 *
 * Separating this from the SSE byte parser is what makes the WS
 * transport possible without duplicating ~150 lines of switch.
 */
export type AgentEventResult = "continue" | "terminal"

export class AgentStreamReducer {
  private segments: StreamSegment[]
  private thinking = ""
  private handlers: StreamConsumerHandlers
  // Buffer for in-flight text events. Per user request 2026-05-13,
  // text is NOT rendered chunk-by-chunk during streaming (no
  // "writing simulation"); we accumulate the chunks here and only
  // flush them as a single segment when the next non-text event
  // arrives or the stream ends. Other event types (tool/widget/
  // progress/file) still render live so the user sees the agent is
  // making progress.
  private pendingText = ""

  constructor(handlers: StreamConsumerHandlers, initial?: StreamSegment[]) {
    this.handlers = handlers
    this.segments = initial ? [...initial] : []
  }

  /** Drop-in callback for callers that want the current segment view.
   *  Pushes BOTH segments and thinking so a host re-mounting (e.g.,
   *  session switch-back) sees the full live state without waiting for
   *  the next inbound event. */
  emit(): void {
    this.handlers.onSegmentsChanged([...this.segments])
    if (this.thinking) {
      this.handlers.onThinkingChanged(this.thinking)
    }
  }

  /** Flush the pending text buffer into a single segment. Called
   *  whenever a non-text event arrives or the stream terminates —
   *  this is what turns the chunk stream into one-shot block
   *  appearance. Idempotent when the buffer is empty.
   *
   *  Also marks the most recent unfinished tool as done (same logic
   *  the old streaming `case "text"` had) since a new text block
   *  implicitly closes any tool group that preceded it. */
  private flushPendingText(): void {
    if (!this.pendingText) return
    const chunk = this.pendingText
    this.pendingText = ""
    const last = this.segments[this.segments.length - 1]
    if (last?.type === "text") {
      last.content += chunk
    } else {
      this.segments.push({ type: "text", content: chunk })
    }
    for (let i = this.segments.length - 2; i >= 0; i--) {
      if (this.segments[i].type === "tool") {
        ;(this.segments[i] as { type: "tool"; done: boolean }).done = true
        break
      }
    }
  }

  /** Process one parsed event. Returns "terminal" on idle / stream_closed. */
  apply(event: RawEvent): AgentEventResult {
    switch (event.type) {
      case "text":
        if (event.content) {
          this.pendingText += event.content
          // No emit — buffered until a non-text event flushes us.
        }
        return "continue"

      case "thinking":
        // Thinking arriving DOES flush any pending text — the agent has
        // moved on from the text block into a reasoning phase.
        this.flushPendingText()
        this.thinking += event.content || ""
        this.handlers.onThinkingChanged(this.thinking)
        this.emit()
        return "continue"

      case "tool_use":
        if (event.name) {
          this.flushPendingText()
          this.segments.push({ type: "tool", name: event.name, input: event.input, done: false })
          this.emit()
        }
        return "continue"

      case "tool_result": {
        this.flushPendingText()
        for (let i = this.segments.length - 1; i >= 0; i--) {
          if (this.segments[i].type === "tool" && !(this.segments[i] as { done: boolean }).done) {
            ;(this.segments[i] as { type: "tool"; done: boolean }).done = true
            break
          }
        }
        this.emit()
        return "continue"
      }

      case "widget": {
        const wt = event.widget?.widgetType || event.widgetType
        const wi = event.widget?.widgetId || event.widgetId
        if (!wt || !wi) return "continue"
        this.flushPendingText()
        const existingIdx = this.segments.findIndex(
          (s) => s.type === "widget" && s.widgetId === wi,
        )
        const widgetSeg: StreamSegment = {
          type: "widget",
          widgetType: wt,
          widgetId: wi,
          status: event.status,
          assets: event.assets,
          count: event.count,
        }
        if (existingIdx >= 0) {
          this.segments[existingIdx] = widgetSeg
        } else {
          this.segments.push(widgetSeg)
        }
        this.emit()
        this.handlers.onWidget({ type: wt, id: wi })
        return "continue"
      }

      case "progress": {
        if (!event.content) return "continue"
        this.flushPendingText()
        const lastSeg = this.segments[this.segments.length - 1]
        if (lastSeg?.type === "progress") {
          lastSeg.messages.push(event.content)
        } else {
          this.segments.push({ type: "progress", messages: [event.content] })
        }
        this.emit()
        return "continue"
      }

      case "file":
        if (!event.name) return "continue"
        this.flushPendingText()
        this.segments.push({
          type: "file",
          name: event.name,
          mimeType: event.mimeType || "",
          url: event.url || "",
        })
        this.emit()
        return "continue"

      case "choice": {
        // ask_choice tool output. Payload may arrive nested under `choice`
        // (live SSE from /messages) or inlined at the top level (replay
        // from /stream where the broker hydrates persisted segments).
        const src = event.choice ?? event
        const question = src.question
        const rawOptions = src.options ?? []
        if (!question || rawOptions.length < 2) return "continue"
        const options = rawOptions
          .map((o) => ({ label: (o.label ?? "").trim(), description: (o.description ?? "").trim() || undefined }))
          .filter((o) => o.label.length > 0)
        if (options.length < 2) return "continue"
        this.flushPendingText()
        this.segments.push({
          type: "choice",
          question,
          options,
          multi_select: !!src.multi_select,
          freeform: src.freeform !== false, // default true
        })
        this.emit()
        return "continue"
      }

      case "error":
        this.flushPendingText()
        this.emit()
        this.handlers.onError(event.content || "Stream error")
        return "continue"

      case "suite_selected":
        this.handlers.onSuiteSelected((event as unknown as { input?: SuitePayload }).input || {})
        return "continue"

      case "attached":
        this.handlers.onAttached?.(event.lastSeen || 0)
        return "continue"

      case "idle":
        // Flush any buffered text before signaling terminal — though in
        // practice the persisted-bubble swap takes over here, so this
        // is mostly defensive.
        this.flushPendingText()
        this.emit()
        this.handlers.onIdle?.()
        return "terminal"

      case "stream_closed":
        this.flushPendingText()
        this.emit()
        this.handlers.onStreamClosed?.()
        return "terminal"

      default:
        return "continue"
    }
  }
}

/**
 * Consume an SSE stream from a Response body and dispatch events into the
 * provided handlers. Returns when the stream ends (EOF, abort, or an explicit
 * `stream_closed` terminal event).
 *
 * The mutating `segments` local array is this consumer's source of truth
 * while the stream is live; the caller re-syncs from it via onSegmentsChanged.
 * This mirrors the original in-place mutation in studio-client.tsx so any
 * quirks (e.g. text coalescing into the last text segment) are preserved.
 */
export async function consumeStream(
  response: Response,
  handlers: StreamConsumerHandlers,
  opts: ConsumeOptions = {},
): Promise<void> {
  if (!response.body) return
  const reader = response.body.getReader()
  const decoder = new TextDecoder()

  const reducer = new AgentStreamReducer(handlers, opts.initialSegments)
  let buffer = ""

  try {
    while (true) {
      if (opts.signal?.aborted) break
      const { done, value } = await reader.read()
      if (done) break
      if (opts.onBytes) opts.onBytes()
      buffer += decoder.decode(value, { stream: true })
      const parts = buffer.split("\n\n")
      buffer = parts.pop() || ""

      for (const part of parts) {
        const trimmed = part.trim()
        if (!trimmed) continue

        let dataLine = ""
        let idLine = ""
        for (const line of trimmed.split("\n")) {
          if (line.startsWith("data: ")) dataLine = line.slice(6)
          else if (line.startsWith("id: ")) idLine = line.slice(4).trim()
        }
        if (!dataLine) continue
        if (idLine && handlers.onEventId) {
          const n = parseInt(idLine, 10)
          if (!Number.isNaN(n)) handlers.onEventId(n)
        }

        let event: RawEvent
        try {
          event = JSON.parse(dataLine)
        } catch {
          continue
        }

        if (reducer.apply(event) === "terminal") return
      }
    }
  } finally {
    try {
      reader.releaseLock()
    } catch {
      // ignore — reader already released on error
    }
  }
}

export type { SuiteId }
