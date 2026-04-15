"use client"

import { memo } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Icon } from "@/components/icon"
import { MarkdownLink } from "@/components/studio/markdown-link"
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
  onPreviewFile?: (file: { url: string; name: string }, images?: { url: string; name: string }[]) => void
}

export const StreamSegments = memo(function StreamSegments({
  segments,
  thinking,
  onStop,
  onPreviewFile,
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

      {/* Segments in order — group consecutive identical done tools */}
      {(() => {
        const rendered: React.ReactNode[] = []
        let i = 0
        while (i < segments.length) {
          const seg = segments[i]

          if (seg.type === "text") {
            rendered.push(
              <div key={i} className={s.textSegment}>
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ a: MarkdownLink }}>
                  {seg.content}
                </ReactMarkdown>
              </div>
            )
            i++
            continue
          }

          if (seg.type === "progress") {
            const msgs = seg.messages
            const visible = msgs.length > 5 ? msgs.slice(-5) : msgs
            const hidden = msgs.length - visible.length
            rendered.push(
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
            i++
            continue
          }

          if (seg.type === "widget") {
            rendered.push(
              <WidgetRenderer
                key={i}
                widgetType={seg.widgetType}
                widgetId={seg.widgetId}
                onPreviewFile={onPreviewFile}
              />
            )
            i++
            continue
          }

          if (seg.type === "file") {
            rendered.push(
              <div key={i} className={s.fileSegment}>
                <Icon icon="hugeicons:file-02" />
                <span>{seg.name}</span>
              </div>
            )
            i++
            continue
          }

          // Tool step — group consecutive done tools with the same name
          if (seg.type === "tool") {
            if (seg.done) {
              let count = 1
              while (
                i + count < segments.length &&
                segments[i + count].type === "tool" &&
                (segments[i + count] as { name: string }).name === seg.name &&
                (segments[i + count] as { done: boolean }).done
              ) {
                count++
              }
              rendered.push(
                <div key={i} className={s.toolStep}>
                  <Icon icon="hugeicons:tick-02" className={s.toolDone} />
                  <span className={s.toolLabelDone}>
                    {toolLabel(seg.name, seg.input, t)}
                  </span>
                  {count > 1 && <span className={s.toolCount}>x{count}</span>}
                </div>
              )
              i += count
            } else {
              rendered.push(
                <div key={i} className={s.toolStep}>
                  <Icon icon="hugeicons:loading-03" className={s.spin} />
                  <span className={s.toolLabelActive}>
                    {toolLabel(seg.name, seg.input, t)}
                  </span>
                  <span className={s.toolRunning}>{t("studio.running")}</span>
                </div>
              )
              i++
            }
            continue
          }

          i++
        }
        return rendered
      })()}

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
