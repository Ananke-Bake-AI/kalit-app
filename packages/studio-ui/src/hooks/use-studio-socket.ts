"use client"

/**
 * useStudioSocket — single per-user multiplexed WebSocket against
 * /api/flow/user-ws. Replaces the patchwork of GET /sessions +
 * GET /sessions/{id}/messages + GET /sessions/{id}/stream + POST
 * /sessions/{id}/messages with one duplex transport.
 *
 * Connection lifetime is owned by the hook: auto-reconnect with
 * exponential backoff (1s → 30s capped) when the socket drops or
 * the server closes. Token resolution is delegated to BrokerClient
 * (cached, 24 h JWT from /api/broker/token).
 *
 * The hook returns:
 *   - status: "connecting" | "open" | "closed"
 *   - subscribe(sessionId): start receiving session_event frames for
 *     a session; auto-resumes on reconnect via lastEventId.
 *   - unsubscribe(sessionId): drop the subscription server-side.
 *   - send({op, ...}): low-level send for write ops (send_message,
 *     create_session, mark_read).
 *   - onMessage(handler): subscribe to ALL inbound frames. The
 *     handler runs synchronously inside the socket's onmessage so
 *     consumers MUST keep work small or schedule async themselves.
 *
 * Higher-level consumers (useStudioChat) build their state machine
 * on top of these primitives.
 */

import { useEffect, useMemo, useRef, useState } from "react"
import { getStudioBrokerClient } from "../host"

export type StudioSocketStatus = "connecting" | "open" | "closed"

export interface StudioSocketFrame {
  type: string
  sessionId?: string
  eventId?: number
  data?: unknown
  [key: string]: unknown
}

export interface StudioSocketAPI {
  status: StudioSocketStatus
  /** True once the underlying WS has fired `open` at least once. */
  ready: boolean
  /** Subscribe to session_event / session_context / session_attached
   *  frames for `sessionId`. Idempotent — calling twice keeps one
   *  subscription. Auto-resumes after a reconnect using the highest
   *  eventId we've observed. */
  subscribe: (sessionId: string) => void
  /** Stop receiving frames for `sessionId`. */
  unsubscribe: (sessionId: string) => void
  /** Low-level send — for ops that fall outside the subscribe model
   *  (send_message, create_session, mark_read). The hook adds the
   *  enqueue-while-disconnected buffering automatically. */
  send: (frame: Record<string, unknown>) => void
  /** Subscribe to every inbound frame. Returns an unsubscribe fn.
   *  Listeners run synchronously inside the message handler — keep
   *  the body small or schedule via queueMicrotask. */
  onMessage: (handler: (frame: StudioSocketFrame) => void) => () => void
}

interface PendingFrame {
  payload: Record<string, unknown>
}

export function useStudioSocket(opts?: { enabled?: boolean }): StudioSocketAPI {
  const enabled = opts?.enabled !== false
  const [status, setStatus] = useState<StudioSocketStatus>("closed")
  const [ready, setReady] = useState(false)

  // The active socket — ref so onmessage closures see the current
  // instance, not a stale render's.
  const wsRef = useRef<WebSocket | null>(null)
  // Pending sends that fired before the socket was open OR while a
  // reconnect was in progress.
  const pendingRef = useRef<PendingFrame[]>([])
  // Subscriptions we want to keep alive across reconnects. Map
  // sessionId → last observed eventId (resume cursor).
  const subsRef = useRef<Map<string, number>>(new Map())
  // Message listeners (broadcast in arrival order).
  const listenersRef = useRef<Set<(frame: StudioSocketFrame) => void>>(new Set())
  // Reconnect bookkeeping. We backoff to a 30 s cap so a wedged
  // broker doesn't spin the browser CPU.
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reconnectAttemptRef = useRef(0)
  // Unmount sentinel — prevents the reconnect path from racing the
  // effect's cleanup when the hook unmounts mid-backoff.
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  // ── Internal: open + wire one socket ─────────────────────────
  useEffect(() => {
    if (!enabled) return

    let cancelled = false

    async function open() {
      if (cancelled || !mountedRef.current) return
      setStatus("connecting")

      let ws: WebSocket
      try {
        ws = await getStudioBrokerClient().connectWebSocket()
      } catch (err) {
        console.warn("[studio-socket] connect failed:", err)
        scheduleReconnect()
        return
      }
      if (cancelled || !mountedRef.current) {
        try { ws.close() } catch { /* noop */ }
        return
      }
      wsRef.current = ws

      ws.onopen = () => {
        setStatus("open")
        setReady(true)
        reconnectAttemptRef.current = 0

        // Drain queued ops first — the user may have hit
        // send_message before the socket was up; we held the frame
        // here so they don't have to re-click.
        for (const p of pendingRef.current) {
          ws.send(JSON.stringify(p.payload))
        }
        pendingRef.current = []

        // Re-subscribe everything we held across the reconnect, with
        // each subscription's resume cursor so we don't replay
        // events the client already rendered.
        for (const [sid, lastEventId] of subsRef.current.entries()) {
          ws.send(JSON.stringify({ op: "subscribe", sessionId: sid, lastEventId }))
        }
      }

      ws.onmessage = (event) => {
        if (typeof event.data !== "string") return
        let frame: StudioSocketFrame
        try {
          frame = JSON.parse(event.data) as StudioSocketFrame
        } catch {
          return
        }
        // Track the highest eventId per session so reconnects can
        // ask the broker to resume from there. session_event
        // carries eventId; session_context carries lastEventId.
        if (frame.type === "session_event" && typeof frame.sessionId === "string" && typeof frame.eventId === "number") {
          const cur = subsRef.current.get(frame.sessionId) ?? 0
          if (frame.eventId > cur) subsRef.current.set(frame.sessionId, frame.eventId)
        } else if (frame.type === "session_context" && typeof frame.sessionId === "string" && typeof frame.lastEventId === "number") {
          const cur = subsRef.current.get(frame.sessionId) ?? 0
          if ((frame.lastEventId as number) > cur) subsRef.current.set(frame.sessionId, frame.lastEventId as number)
        }
        // Fan out to consumers.
        for (const fn of listenersRef.current) {
          try {
            fn(frame)
          } catch (err) {
            console.error("[studio-socket] listener threw:", err)
          }
        }
      }

      ws.onclose = () => {
        if (wsRef.current === ws) wsRef.current = null
        setStatus("closed")
        if (!cancelled && mountedRef.current) {
          scheduleReconnect()
        }
      }

      ws.onerror = (err) => {
        console.warn("[studio-socket] error:", err)
        // onclose follows automatically — let it drive the reconnect.
      }
    }

    function scheduleReconnect() {
      if (reconnectTimerRef.current != null) return
      const attempt = ++reconnectAttemptRef.current
      // Exponential backoff: 1s, 2s, 4s, …, capped at 30s. Plus a
      // ±20% jitter so a population of clients doesn't sync-flood
      // the broker after a brief outage.
      const base = Math.min(30000, 1000 * Math.pow(2, attempt - 1))
      const jitter = base * (0.8 + Math.random() * 0.4)
      reconnectTimerRef.current = setTimeout(() => {
        reconnectTimerRef.current = null
        if (!cancelled && mountedRef.current) open()
      }, jitter)
    }

    open()

    return () => {
      cancelled = true
      if (reconnectTimerRef.current != null) {
        clearTimeout(reconnectTimerRef.current)
        reconnectTimerRef.current = null
      }
      const ws = wsRef.current
      wsRef.current = null
      if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
        try { ws.close(1000, "unmount") } catch { /* noop */ }
      }
      setReady(false)
      setStatus("closed")
    }
  }, [enabled])

  // ── Public API methods (stable refs via useMemo + useRef) ────
  const api = useMemo<StudioSocketAPI>(() => ({
    status,
    ready,
    subscribe(sessionId: string) {
      if (!sessionId) return
      // Remember the subscription even when the socket is down so
      // a future reconnect's onopen will re-subscribe.
      if (!subsRef.current.has(sessionId)) {
        subsRef.current.set(sessionId, 0)
      }
      const lastEventId = subsRef.current.get(sessionId) ?? 0
      sendOrQueue({ op: "subscribe", sessionId, lastEventId })
    },
    unsubscribe(sessionId: string) {
      if (!sessionId) return
      subsRef.current.delete(sessionId)
      sendOrQueue({ op: "unsubscribe", sessionId })
    },
    send(frame: Record<string, unknown>) {
      sendOrQueue(frame)
    },
    onMessage(handler: (frame: StudioSocketFrame) => void) {
      listenersRef.current.add(handler)
      return () => {
        listenersRef.current.delete(handler)
      }
    },
  }), [status, ready])

  return api

  function sendOrQueue(payload: Record<string, unknown>) {
    const ws = wsRef.current
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(payload))
      return
    }
    // Queue size cap — paranoid hedge against an offline tab that
    // accumulates send_message calls for hours. 100 is well past
    // any realistic user burst.
    if (pendingRef.current.length >= 100) {
      pendingRef.current.shift()
    }
    pendingRef.current.push({ payload })
  }
}
