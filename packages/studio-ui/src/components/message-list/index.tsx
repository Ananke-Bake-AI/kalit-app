"use client"

import { Fragment, useCallback, useEffect, useRef } from "react"
import { useStudioStore } from "../../store"
import { useI18n } from "@kalit/i18n/react"
import { MessageBubble } from "../message-bubble"
import { StreamSegments } from "../stream-segments"
import { formatDaySeparator, isSameDay } from "../../lib/format-date"
import s from "./message-list.module.scss"

interface MessageListProps {
  onStop?: () => void
  onPreviewFile?: (file: { url: string; name: string }, images?: { url: string; name: string }[]) => void
  onRefreshMessages?: () => void
}

export function MessageList({ onStop, onPreviewFile, onRefreshMessages }: MessageListProps) {
  const { locale } = useI18n()
  const messages = useStudioStore((s) => s.messages)
  const isStreaming = useStudioStore((s) => s.isStreaming)
  const streamSegments = useStudioStore((s) => s.streamSegments)
  const streamThinking = useStudioStore((s) => s.streamThinking)
  const showToolBadges = useStudioStore((s) => s.showToolBadges)
  const error = useStudioStore((s) => s.error)

  const scrollRef = useRef<HTMLDivElement>(null)
  const userScrolledUp = useRef(false)

  // ── Smart scroll: don't force if user scrolled up ────
  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    userScrolledUp.current = distanceFromBottom > 80
  }, [])

  // ── Auto-scroll on new content — scroll ONLY the chat container,
  //    never the document (scrollIntoView bubbles up to ancestors).
  useEffect(() => {
    if (userScrolledUp.current) return
    const el = scrollRef.current
    if (!el) return
    // Double-rAF: wait for layout to settle after DOM mutations
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (userScrolledUp.current) return
        el.scrollTo({ top: el.scrollHeight, behavior: "smooth" })
      })
    })
  }, [messages, streamSegments, isStreaming])

  // ── Auto-scroll while the typewriter reveals — the inner content height
  //    grows char-by-char without re-rendering MessageList, so the effect
  //    above misses it. ResizeObserver watches the list's actual size and
  //    keeps the bottom in view as text appears.
  const listRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const list = listRef.current
    const scroller = scrollRef.current
    if (!list || !scroller) return
    const ro = new ResizeObserver(() => {
      if (userScrolledUp.current) return
      // No smooth here — the typewriter grows in tiny increments and a
      // smooth animation per tick would lag behind the reveal.
      scroller.scrollTop = scroller.scrollHeight
    })
    ro.observe(list)
    return () => ro.disconnect()
  }, [])

  // ── Reset scroll lock when session changes ───────────
  const activeSessionId = useStudioStore((s) => s.activeSessionId)
  useEffect(() => {
    userScrolledUp.current = false
    requestAnimationFrame(() => {
      const el = scrollRef.current
      if (!el) return
      el.scrollTop = el.scrollHeight
    })
  }, [activeSessionId])

  // ── Force-scroll on outgoing user message ────────────
  //    Sending a message should always make it visible, regardless of
  //    whether the user happened to be scrolled up. Reset the lock too so
  //    subsequent typewriter ticks can keep the conversation pinned.
  const lastMessageId = messages.length > 0 ? messages[messages.length - 1].id : null
  const lastMessageRole = messages.length > 0 ? messages[messages.length - 1].role : null
  const lastSeenIdRef = useRef<string | null>(null)
  useEffect(() => {
    if (!lastMessageId || lastMessageId === lastSeenIdRef.current) return
    lastSeenIdRef.current = lastMessageId
    if (lastMessageRole !== "user") return
    userScrolledUp.current = false
    const el = scrollRef.current
    if (!el) return
    // Two rAFs let the textarea collapse + new bubble lay out before we jump.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.scrollTop = el.scrollHeight
      })
    })
  }, [lastMessageId, lastMessageRole])

  const setStreamSegments = useStudioStore((s) => s.setStreamSegments)
  const visibleAll = messages.filter((m) => m.role !== "system" && m.role !== "widget")
  // While the typewriter is still revealing the live response (streamSegments
  // populated, even after the broker stream ended), hide the persisted last
  // assistant bubble so the user doesn't see the same content twice. The
  // typewriter fires `onCaughtUp` when it has drained the buffer, which clears
  // streamSegments and brings the persisted bubble back instantly.
  const hideLastAssistant =
    streamSegments.length > 0 &&
    visibleAll.length > 0 &&
    visibleAll[visibleAll.length - 1].role === "assistant"
  const visible = hideLastAssistant ? visibleAll.slice(0, -1) : visibleAll

  return (
    <div className={s.scroll} ref={scrollRef} onScroll={handleScroll}>
      <div className={s.list} ref={listRef}>
        {visible.map((msg, i) => {
          const prev = visible[i - 1]
          const showSeparator = !prev || !isSameDay(prev.createdAt, msg.createdAt)
          return (
            <Fragment key={msg.id}>
              {showSeparator && (
                <div className={s.daySeparator}>
                  <span>{formatDaySeparator(msg.createdAt, locale)}</span>
                </div>
              )}
              <MessageBubble
                message={msg}
                showToolBadges={showToolBadges}
                onPreviewFile={onPreviewFile}
                onRefreshMessages={onRefreshMessages}
              />
            </Fragment>
          )
        })}

        {/* Live + draining streaming segments */}
        {streamSegments.length > 0 && (
          <div className={s.streamRow}>
            <StreamSegments
              segments={streamSegments}
              thinking={streamThinking}
              onStop={isStreaming ? onStop : undefined}
              onPreviewFile={onPreviewFile}
              live={isStreaming}
              onCaughtUp={() => setStreamSegments([])}
            />
          </div>
        )}

        {/* Streaming with no segments yet — just dots */}
        {isStreaming && streamSegments.length === 0 && (
          <div className={s.streamRow}>
            <div className={s.dots}>
              <span /><span /><span />
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className={s.error}>{error}</div>
        )}
      </div>
    </div>
  )
}
