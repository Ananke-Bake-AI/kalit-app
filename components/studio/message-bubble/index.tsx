"use client"

import { memo, useMemo, useState } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Icon } from "@/components/icon"
import { useI18n } from "@/stores/i18n"
import { WidgetRenderer } from "@/components/studio/widget-renderer"
import type { ChatMessage } from "@/types/studio"
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
  onPreviewFile?: (file: { url: string; name: string }) => void
}

export const MessageBubble = memo(function MessageBubble({ message, showToolBadges, onRefreshMessages, onPreviewFile }: MessageBubbleProps) {
  const { t } = useI18n()
  const [thinkingOpen, setThinkingOpen] = useState(false)

  // Parse segments from stored JSON (broker stores assistant content as segment arrays)
  const segments = useMemo(() => parseSegments(message.content), [message.content])
  const displayText = useMemo(
    () => (segments ? extractPlainText(segments) : message.content),
    [segments, message.content],
  )

  if (message.role === "user") {
    return (
      <div className={s.row} data-role="user">
        <div className={s.bubbleUser}>
          {/* Attached files */}
          {message.files && message.files.length > 0 && (
            <div className={s.fileList}>
              {message.files.map((f) => {
                const ext = getExt(f.name)
                if (IMAGE_EXTS.includes(ext)) {
                  return (
                    <img
                      key={f.fileId}
                      src={f.url}
                      alt={f.name}
                      className={s.inlineImage}
                      loading="lazy"
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
          segments.map((seg, i) => {
            if (seg.type === "text" && seg.content) {
              return (
                <div key={i} className={s.markdown}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {seg.content}
                  </ReactMarkdown>
                </div>
              )
            }
            if (seg.type === "tool") {
              return (
                <div key={i} className={s.toolStep}>
                  <Icon icon="hugeicons:tick-02" className={s.toolDone} />
                  <span className={s.toolLabelDone}>
                    {seg.name}
                  </span>
                </div>
              )
            }
            if (seg.type === "progress") {
              const msgs = seg.messages || []
              const visible = msgs.length > 3 ? msgs.slice(-3) : msgs
              const hidden = msgs.length - visible.length
              return (
                <div key={i} className={s.progressSegment}>
                  {hidden > 0 && (
                    <span className={s.progressHidden}>
                      {hidden} previous updates
                    </span>
                  )}
                  {visible.map((m, j) => (
                    <div key={j} className={s.progressLine}>
                      <Icon icon="hugeicons:tick-02" className={s.progressCheck} />
                      <span className={s.progressTextDone}>{m}</span>
                    </div>
                  ))}
                </div>
              )
            }
            if (seg.type === "widget" && seg.widgetType && seg.widgetId) {
              return (
                <WidgetRenderer
                  key={i}
                  widgetType={seg.widgetType}
                  widgetId={seg.widgetId}
                  messageCreatedAt={message.createdAt}
                  onCompleted={onRefreshMessages}
                  onPreviewFile={onPreviewFile}
                />
              )
            }
            if (seg.type === "file" && seg.name) {
              return (
                <div key={i} className={s.fileSegment}>
                  <Icon icon="hugeicons:file-02" />
                  <span>{seg.name}</span>
                </div>
              )
            }
            return null
          })
        ) : (
          displayText && (
            <div className={s.markdown}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {displayText}
              </ReactMarkdown>
            </div>
          )
        )}
      </div>
    </div>
  )
})
