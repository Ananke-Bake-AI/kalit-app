"use client"

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Icon } from "../../primitives/icon"
import { useI18n } from "@kalit/i18n/react"
import { MarkdownLink } from "../markdown-link"
import { WidgetRenderer } from "../widget-renderer"
import { formatTime } from "../../lib/format-date"
import { toClientFileUrl } from "../../host"
import type { ChatMessage } from "../../types"
import s from "./message-bubble.module.scss"

// ---------------------------------------------------------------------------
// Asset detection helpers
// ---------------------------------------------------------------------------

const IMAGE_EXTS = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp", ".svg"]

function getExt(path: string): string {
  const dot = path.lastIndexOf(".")
  return dot >= 0 ? path.slice(dot).toLowerCase() : ""
}

// ---------------------------------------------------------------------------
// Segment parsing — broker stores assistant messages as JSON arrays of
// {type, content, name, input, done, widgetType, widgetId, ...} segments.
// ---------------------------------------------------------------------------

interface ParsedSegment {
  type: string
  content?: string
  name?: string
  input?: unknown
  done?: boolean
  widgetType?: string
  widgetId?: string
  status?: string
  assets?: string[]
  count?: number
  mimeType?: string
  url?: string
  messages?: string[]
}

function parseSegments(content: string): ParsedSegment[] | null {
  if (!content.startsWith("[")) return null
  try {
    const parsed = JSON.parse(content)
    if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].type) {
      return parsed
    }
  } catch { /* not segments JSON */ }
  return null
}

function extractPlainText(segments: ParsedSegment[]): string {
  return segments
    .filter((seg) => seg.type === "text")
    .map((seg) => seg.content || "")
    .join("")
    .replace(/\[\[(respawn|project|hotfix|research|task):[^\]]+\]\]/g, "")
    .trim()
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface MessageBubbleProps {
  message: ChatMessage
  showToolBadges?: boolean
  onRefreshMessages?: () => void
  onPreviewFile?: (file: { url: string; name: string }, images?: { url: string; name: string }[]) => void
}

export const MessageBubble = memo(function MessageBubble({ message, showToolBadges, onRefreshMessages, onPreviewFile }: MessageBubbleProps) {
  const { t, locale } = useI18n()
  const [thinkingOpen, setThinkingOpen] = useState(false)
  const timeLabel = formatTime(message.createdAt, locale)
  const fullTimestamp = new Date(message.createdAt).toLocaleString(locale)

  // Parse segments from stored JSON (broker stores assistant content as segment arrays)
  const segments = useMemo(() => parseSegments(message.content), [message.content])
  const displayText = useMemo(
    () => (segments ? extractPlainText(segments) : message.content),
    [segments, message.content],
  )

  const [copied, setCopied] = useState(false)
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => { if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current) }, [])
  const copyText = message.role === "user" ? message.content : displayText
  const handleCopy = useCallback(async () => {
    if (!copyText) return
    try {
      await navigator.clipboard.writeText(copyText)
      setCopied(true)
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current)
      copyTimeoutRef.current = setTimeout(() => setCopied(false), 1500)
    } catch {
      // clipboard may be blocked in non-secure contexts — silent
    }
  }, [copyText])

  const copyBtn = copyText ? (
    <button
      type="button"
      className={s.copyBtn}
      onClick={handleCopy}
      title={copied ? t("studio.copied") : t("studio.copy")}
      aria-label={copied ? t("studio.copied") : t("studio.copy")}
    >
      <Icon icon={copied ? "hugeicons:tick-02" : "hugeicons:copy-01"} />
    </button>
  ) : null

  if (message.role === "user") {
    return (
      <div className={s.row} data-role="user">
        <div className={s.bubbleUser}>
          {/* Attached files */}
          {message.files && message.files.length > 0 && (
            <div className={s.fileList}>
              {message.files.map((f) => {
                const ext = getExt(f.name)
                const src = toClientFileUrl(f.url)
                if (IMAGE_EXTS.includes(ext)) {
                  return (
                    <img
                      key={f.fileId}
                      src={src}
                      alt={f.name}
                      className={s.inlineImage}
                      loading="lazy"
                      onClick={() => onPreviewFile?.({ url: src, name: f.name })}
                    />
                  )
                }
                return (
                  <span key={f.fileId} className={s.fileChip}>
                    <Icon icon="hugeicons:file-02" />
                    {f.name}
                  </span>
                )
              })}
            </div>
          )}
          <span>{message.content}</span>
          <div className={s.metaRow}>
            {copyBtn}
            <span className={s.timestamp} title={fullTimestamp}>{timeLabel}</span>
          </div>
        </div>
      </div>
    )
  }

  // Assistant / system message
  return (
    <div className={s.row} data-role="assistant">
      <div className={s.bubbleAssistant}>
        {/* Thinking (collapsible) */}
        {message.thinking && (
          <div className={s.thinking}>
            <button
              className={s.thinkingToggle}
              onClick={() => setThinkingOpen(!thinkingOpen)}
            >
              <Icon icon={thinkingOpen ? "hugeicons:arrow-down-01" : "hugeicons:arrow-right-01"} />
              <span>{t("studio.thinking")}</span>
            </button>
            {thinkingOpen && (
              <div className={s.thinkingContent}>
                {message.thinking}
              </div>
            )}
          </div>
        )}

        {/* Tool badges (legacy — for old messages without segments) */}
        {showToolBadges && !segments && message.tools && message.tools.length > 0 && (
          <div className={s.tools}>
            {message.tools.map((tool, i) => (
              <span key={i} className={s.toolBadge}>
                <Icon icon="hugeicons:wrench-01" />
                {tool.name}
              </span>
            ))}
          </div>
        )}

        {/* Widget (standalone widget messages) */}
        {message.widget && (
          <WidgetRenderer
            widgetType={message.widget.type}
            widgetId={message.widget.id}
            messageCreatedAt={message.createdAt}
            onCompleted={onRefreshMessages}
            onPreviewFile={onPreviewFile}
          />
        )}

        {/* Render segments or plain text */}
        {segments ? (
          (() => {
            const rendered: React.ReactNode[] = []
            let i = 0
            while (i < segments.length) {
              const seg = segments[i]

              if (seg.type === "text" && seg.content) {
                rendered.push(
                  <div key={i} className={s.markdown}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ a: MarkdownLink }}>
                      {seg.content}
                    </ReactMarkdown>
                  </div>
                )
                i++
                continue
              }
              if (seg.type === "tool") {
                const isDone = (seg as { done?: boolean }).done !== false
                // Only group consecutive tools with the same name AND
                // same done-state. Without the done-state guard we'd
                // hide an in-flight tool inside a "x5" badge with the
                // four older done ones — the spinner gets lost.
                let count = 1
                if (isDone) {
                  while (
                    i + count < segments.length &&
                    segments[i + count].type === "tool" &&
                    (segments[i + count] as { name: string }).name === seg.name &&
                    (segments[i + count] as { done?: boolean }).done !== false
                  ) {
                    count++
                  }
                }
                rendered.push(
                  <div key={i} className={s.toolStep}>
                    {isDone ? (
                      <Icon icon="hugeicons:tick-02" className={s.toolDone} />
                    ) : (
                      <Icon icon="hugeicons:loading-03" className={s.spin} />
                    )}
                    <span className={isDone ? s.toolLabelDone : s.toolLabelActive}>
                      {seg.name}
                    </span>
                    {count > 1 && <span className={s.toolCount}>x{count}</span>}
                  </div>
                )
                i += count
                continue
              }
              if (seg.type === "progress") {
                const msgs = seg.messages || []
                const visible = msgs.length > 3 ? msgs.slice(-3) : msgs
                const hidden = msgs.length - visible.length
                // Heuristic for "still waiting": the message immediately
                // following this progress segment tells the story. If the
                // next sibling is an unfinished tool (rare — tools come
                // BEFORE their progress), or if there's no terminating
                // tool_result yet, the LAST progress line is the live
                // one. Simpler signal: walk backward from the end of the
                // whole `segments` array; if the most recent tool is
                // unfinished, the last progress line in THIS segment is
                // the active one. Otherwise everything is settled.
                let trailingActive = false
                for (let k = segments.length - 1; k >= 0; k--) {
                  const s = segments[k]
                  if (s.type === "tool") {
                    trailingActive = (s as { done?: boolean }).done === false
                    break
                  }
                }
                rendered.push(
                  <div key={i} className={s.progressSegment}>
                    {hidden > 0 && (
                      <span className={s.progressHidden}>
                        {hidden} previous updates
                      </span>
                    )}
                    {visible.map((m, j) => {
                      const isLast = j === visible.length - 1
                      const showAsActive = isLast && trailingActive
                      return (
                        <div key={j} className={s.progressLine}>
                          {showAsActive ? (
                            <span className={s.progressDotActive} />
                          ) : (
                            <Icon icon="hugeicons:tick-02" className={s.progressCheck} />
                          )}
                          <span className={showAsActive ? s.progressTextActive : s.progressTextDone}>{m}</span>
                        </div>
                      )
                    })}
                  </div>
                )
                i++
                continue
              }
              if (seg.type === "widget" && seg.widgetType && seg.widgetId) {
                rendered.push(
                  <WidgetRenderer
                    key={i}
                    widgetType={seg.widgetType}
                    widgetId={seg.widgetId}
                    messageCreatedAt={message.createdAt}
                    onCompleted={onRefreshMessages}
                    onPreviewFile={onPreviewFile}
                  />
                )
                i++
                continue
              }
              if (seg.type === "file" && seg.name) {
                rendered.push(
                  <div key={i} className={s.fileSegment}>
                    <Icon icon="hugeicons:file-02" />
                    <span>{seg.name}</span>
                  </div>
                )
                i++
                continue
              }
              i++
            }
            return rendered
          })()
        ) : (
          displayText && (
            <div className={s.markdown}>
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ a: MarkdownLink }}>
                {displayText}
              </ReactMarkdown>
            </div>
          )
        )}
        <div className={s.metaRow}>
          {copyBtn}
          <span className={s.timestamp} title={fullTimestamp}>{timeLabel}</span>
        </div>
      </div>
    </div>
  )
})
