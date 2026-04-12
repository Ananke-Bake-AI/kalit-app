"use client"

import { useCallback, useEffect, useRef } from "react"
import { useStudioStore } from "@/stores/studio"
import { MessageBubble } from "@/components/studio/message-bubble"
import { StreamSegments } from "@/components/studio/stream-segments"
import s from "./message-list.module.scss"

interface MessageListProps {
  onStop?: () => void
  onPreviewFile?: (file: { url: string; name: string }) => void
  onRefreshMessages?: () => void
}

export function MessageList({ onStop, onPreviewFile, onRefreshMessages }: MessageListProps) {
  const messages = useStudioStore((s) => s.messages)
  const isStreaming = useStudioStore((s) => s.isStreaming)
  const streamSegments = useStudioStore((s) => s.streamSegments)
  const streamThinking = useStudioStore((s) => s.streamThinking)
  const showToolBadges = useStudioStore((s) => s.showToolBadges)
  const error = useStudioStore((s) => s.error)

  const scrollRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const userScrolledUp = useRef(false)

  // ── Smart scroll: don't force if user scrolled up ────
  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    userScrolledUp.current = distanceFromBottom > 80
  }, [])

  // ── Auto-scroll on new content ───────────────────────
  useEffect(() => {
    if (userScrolledUp.current) return
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, streamSegments, isStreaming])

  // ── Reset scroll lock when session changes ───────────
  const activeSessionId = useStudioStore((s) => s.activeSessionId)
  useEffect(() => {
    userScrolledUp.current = false
    // Scroll to bottom immediately on session change
    requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior: "instant" })
    })
  }, [activeSessionId])

  const visible = messages.filter((m) => m.role !== "system" && m.role !== "widget")

  return (
    <div className={s.scroll} ref={scrollRef} onScroll={handleScroll}>
      <div className={s.list}>
        {visible.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            showToolBadges={showToolBadges}
            onPreviewFile={onPreviewFile}
            onRefreshMessages={onRefreshMessages}
          />
        ))}

        {/* Live streaming segments */}
        {isStreaming && streamSegments.length > 0 && (
          <div className={s.streamRow}>
            <StreamSegments
              segments={streamSegments}
              thinking={streamThinking}
              onStop={onStop}
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

        <div ref={bottomRef} />
      </div>
    </div>
  )
}
