"use client"

import { memo } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Icon } from "@/components/icon"
import { WidgetRenderer } from "@/components/studio/widget-renderer"
import { useI18n } from "@/stores/i18n"
import type { StreamSegment } from "@/types/studio"
import s from "./stream-segments.module.scss"

// ---------------------------------------------------------------------------
// Tool step helpers
// ---------------------------------------------------------------------------

/** Maps tool names to i18n keys under the "studio" namespace. */
const TOOL_I18N_KEYS: Record<string, string> = {
  "find-assets": "studio.toolFindAssets",
  "find-references": "studio.toolFindRefs",
  grep: "studio.toolGrep",
  shell: "studio.toolShell",
  deploy: "studio.toolDeploy",
  hotfix: "studio.toolHotfix",
  write_file: "studio.toolWriteFile",
  read_file: "studio.toolReadFile",
  create_file: "studio.toolCreateFile",
  edit_file: "studio.toolEditFile",
  list_files: "studio.toolListFiles",
  search: "studio.toolSearch",
}

function toolLabel(name: string, input: unknown, t: (key: string, params?: Record<string, string | number>) => string): string {
  const key = TOOL_I18N_KEYS[name]
  const base = key ? t(key) : name
  if (input && typeof input === "object" && "query" in input) {
    return `${base}: ${(input as { query: string }).query}`
  }
  if (input && typeof input === "object" && "path" in input) {
    return `${base}: ${(input as { path: string }).path}`
  }
  return base
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface StreamSegmentsProps {
  segments: StreamSegment[]
  thinking?: string
  onStop?: () => void
}

export const StreamSegments = memo(function StreamSegments({
  segments,
  thinking,
  onStop,
}: StreamSegmentsProps) {
  const { t } = useI18n()

  return (
    <div className={s.container}>
      {/* Thinking (if any) */}
      {thinking && (
        <div className={s.thinkingBar}>
          <Icon icon="hugeicons:loading-03" className={s.spin} />
          <span>{t("studio.thinkingEllipsis")}</span>
        </div>
      )}

      {/* Segments in order */}
      {segments.map((seg, i) => {
        if (seg.type === "text") {
          return (
            <div key={i} className={s.textSegment}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {seg.content}
              </ReactMarkdown>
            </div>
          )
        }

        if (seg.type === "progress") {
          const msgs = seg.messages
          const visible = msgs.length > 5 ? msgs.slice(-5) : msgs
          const hidden = msgs.length - visible.length
          return (
            <div key={i} className={s.progressSegment}>
              {hidden > 0 && (
                <span className={s.progressHidden}>{t("studio.previousUpdates", { count: hidden })}</span>
              )}
              {visible.map((m, j) => {
                const isLast = j === visible.length - 1
                return (
                  <div key={j} className={s.progressLine}>
                    {isLast ? (
                      <span className={s.progressDotActive} />
                    ) : (
                      <Icon icon="hugeicons:tick-02" className={s.progressCheck} />
                    )}
                    <span className={isLast ? s.progressTextActive : s.progressTextDone}>
                      {m}
                    </span>
                  </div>
                )
              })}
            </div>
          )
        }

        if (seg.type === "widget") {
          return (
            <WidgetRenderer
              key={i}
              widgetType={seg.widgetType}
              widgetId={seg.widgetId}
            />
          )
        }

        if (seg.type === "file") {
          return (
            <div key={i} className={s.fileSegment}>
              <Icon icon="hugeicons:file-02" />
              <span>{seg.name}</span>
            </div>
          )
        }

        // Tool step
        if (seg.type === "tool") {
          return (
            <div key={i} className={s.toolStep}>
              {seg.done ? (
                <Icon icon="hugeicons:tick-02" className={s.toolDone} />
              ) : (
                <Icon icon="hugeicons:loading-03" className={s.spin} />
              )}
              <span className={seg.done ? s.toolLabelDone : s.toolLabelActive}>
                {toolLabel(seg.name, seg.input, t)}
              </span>
              {!seg.done && <span className={s.toolRunning}>{t("studio.running")}</span>}
            </div>
          )
        }

        return null
      })}

      {/* Typing dots + stop button */}
      <div className={s.footer}>
        <div className={s.dots}>
          <span /><span /><span />
        </div>
        {onStop && (
          <button className={s.stopBtn} onClick={onStop}>
            <Icon icon="hugeicons:stop" />
            {t("studio.stop")}
          </button>
        )}
      </div>
    </div>
  )
})
