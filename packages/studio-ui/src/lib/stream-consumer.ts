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

  constructor(handlers: StreamConsumerHandlers, initial?: StreamSegment[]) {
    this.handlers = handlers
    this.segments = initial ? [...initial] : []
  }

  /** Drop-in callback for callers that want the current segment view. */
  emit(): void {
    this.handlers.onSegmentsChanged([...this.segments])
  }

  /** Process one parsed event. Returns "terminal" on idle / stream_closed. */
  apply(event: RawEvent): AgentEventResult {
    switch (event.type) {
      case "text":
        if (event.content) {
          const last = this.segments[this.segments.length - 1]
          if (last?.type === "text") {
            last.content += event.content
          } else {
            this.segments.push({ type: "text", content: event.content })
          }
          // Mark previous tool as done when new text arrives.
          for (let i = this.segments.length - 2; i >= 0; i--) {
            if (this.segments[i].type === "tool") {
              ;(this.segments[i] as { type: "tool"; done: boolean }).done = true
              break
            }
          }
          this.emit()
        }
        return "continue"

      case "thinking":
        this.thinking += event.content || ""
        this.handlers.onThinkingChanged(this.thinking)
        return "continue"

      case "tool_use":
        if (event.name) {
          this.segments.push({ type: "tool", name: event.name, input: event.input, done: false })
          this.emit()
        }
        return "continue"

      case "tool_result": {
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
        this.segments.push({
          type: "file",
          name: event.name,
          mimeType: event.mimeType || "",
          url: event.url || "",
        })
        this.emit()
        return "continue"

      case "error":
        this.handlers.onError(event.content || "Stream error")
        return "continue"

      case "suite_selected":
        this.handlers.onSuiteSelected((event as unknown as { input?: SuitePayload }).input || {})
        return "continue"

      case "attached":
        this.handlers.onAttached?.(event.lastSeen || 0)
        return "continue"

      case "idle":
        this.handlers.onIdle?.()
        return "terminal"

      case "stream_closed":
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
