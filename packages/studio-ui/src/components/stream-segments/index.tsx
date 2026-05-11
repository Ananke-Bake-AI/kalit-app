"use client"

import { memo, useEffect, useRef, useState } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Icon } from "../../primitives/icon"
import { MarkdownLink } from "../markdown-link"
import { WidgetRenderer } from "../widget-renderer"
import { useI18n } from "@kalit/i18n/react"
import type { StreamSegment } from "../../types"
import s from "./stream-segments.module.scss"

// ---------------------------------------------------------------------------
// TypewriterMarkdown — paces in-flight LLM chunks so the text appears at a
// human-feeling rate instead of arriving in jagged bursts. Only the live
// (last + active) text segment animates; on initial mount or when streaming
// is over, the content shows in full immediately.
// ---------------------------------------------------------------------------

// Tick every 50ms. At low backlog reveal 1 char per tick (≈ 20 chars/sec —
// distinctly letter-by-letter). Past BACKLOG_THRESHOLD chars buffered, step
// up to a max of 3 chars/tick so a long answer eventually finishes without
// the user waiting forever, but never fast enough to look like a block.
const BACKLOG_THRESHOLD = 100
const TICK_MS = 25
const MAX_STEP = 4

function TypewriterMarkdown({
  content,
  animate,
  forceComplete,
  onCaughtUp,
}: {
  content: string
  animate: boolean
  /** When true, the parent has decided this segment is no longer the live
   * tail (a sibling text segment took over). Snap to full content
   * immediately so we don't have two typewriters typing in parallel. */
  forceComplete?: boolean
  onCaughtUp?: () => void
}) {
  // Letter-by-letter reveal driven by a fixed-interval setInterval. The
  // target text is updated via ref so incoming SSE chunks don't disturb the
  // running interval — they just extend the target the interval is walking
  // toward. The interval keeps running even after `animate` flips false:
  // we want the typewriter to drain whatever buffered content remains,
  // then fire `onCaughtUp` so the parent can replace the live view with
  // the persisted message bubble seamlessly.
  const [revealed, setRevealed] = useState<string>(() =>
    !animate || forceComplete ? content : "",
  )
  const targetRef = useRef(content)
  const lenRef = useRef<number>(!animate || forceComplete ? content.length : 0)
  const animateRef = useRef(animate)
  const caughtUpFiredRef = useRef(false)
  const onCaughtUpRef = useRef(onCaughtUp)

  useEffect(() => {
    onCaughtUpRef.current = onCaughtUp
  }, [onCaughtUp])

  useEffect(() => {
    targetRef.current = content
  }, [content])

  useEffect(() => {
    animateRef.current = animate
    // When `animate` flips back to true (next stream starts), give the
    // typewriter another chance to fire onCaughtUp at the new endpoint.
    if (animate) caughtUpFiredRef.current = false
  }, [animate])

  // When this segment loses tail status (a newer text segment from the
  // SAME turn took over the typewriter), snap to full immediately so the
  // user sees a single active typewriter — not multiple overlapping ones
  // crawling at human pace. Without this, the agent emitting "I'll do X"
  // → tool → "Done" would have both messages typing in parallel.
  useEffect(() => {
    if (forceComplete && lenRef.current < targetRef.current.length) {
      lenRef.current = targetRef.current.length
      setRevealed(targetRef.current)
    }
  }, [forceComplete])

  // The interval lives once per mount; it walks toward the current target
  // and watches `animateRef` to know whether it should ever stop early
  // (it should not — the contract is: drain to the end at human pace).
  useEffect(() => {
    if ((!animate || forceComplete) && lenRef.current >= content.length) {
      // Past message rendered for the first time — snap.
      setRevealed(content)
      return
    }
    const interval = setInterval(() => {
      const target = targetRef.current
      let len = lenRef.current
      if (len >= target.length) {
        // Caught up. If the stream is no longer live, signal parent so it
        // can swap to the persisted message bubble.
        if (!animateRef.current && !caughtUpFiredRef.current) {
          caughtUpFiredRef.current = true
          onCaughtUpRef.current?.()
        }
        return
      }
      const backlog = target.length - len
      const step = backlog > BACKLOG_THRESHOLD
        ? Math.min(MAX_STEP, 1 + Math.floor(backlog / 200))
        : 1
      len = Math.min(target.length, len + step)
      lenRef.current = len
      setRevealed(target.slice(0, len))
    }, TICK_MS)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Render markdown live, but split the revealed text at the last "stable
  // cut" so unclosed inline markers (mid `**`, `*`, `` ` ``, `[link`,
  // unfinished fenced block) don't make the last character flip between
  // text and strong/code/link nodes on every tick. The stable prefix
  // goes through ReactMarkdown so users see colors, code highlighting,
  // links, etc. immediately as the text streams; the unstable tail is
  // appended as a styled inline span (`pre-wrap` so whitespace survives)
  // and gets absorbed into the markdown body once the next safe cut is
  // reached. When the typewriter has caught up, render the whole thing
  // as markdown without a tail.
  const fullyRevealed = lenRef.current >= targetRef.current.length && !animate
  if (fullyRevealed) {
    return (
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ a: MarkdownLink }}>
        {revealed}
      </ReactMarkdown>
    )
  }
  const cut = stableMarkdownCut(revealed)
  const stable = revealed.slice(0, cut)
  const tail = revealed.slice(cut)
  return (
    <>
      {stable && (
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ a: MarkdownLink }}>
          {stable}
        </ReactMarkdown>
      )}
      {tail && <span style={{ whiteSpace: "pre-wrap" }}>{tail}</span>}
    </>
  )
}

/**
 * Returns the index up to which `text` is safe to feed ReactMarkdown
 * during streaming. The unstable suffix (anything after the cut) is the
 * trailing run that contains an inline marker the parser would otherwise
 * keep flipping between two interpretations on each new char (`**` vs
 * text, `[` vs link, `` ` `` vs code).
 *
 * Heuristic, not a full parser:
 *   - Walks line by line: lines past the last full line are unstable
 *     unless they're whitespace-only.
 *   - Inside the last line, finds the rightmost unclosed inline marker
 *     and cuts before it.
 *   - Open code fences (```) make every following line unstable until
 *     the closing fence arrives.
 */
function stableMarkdownCut(text: string): number {
  if (!text) return 0

  // 1) Open code fence detection: count ``` markers; odd → in a fence.
  // When inside, we cut at the LAST line break before the unclosed fence.
  const fenceMatches = text.match(/```/g)
  if (fenceMatches && fenceMatches.length % 2 === 1) {
    // Find the last ``` and cut just before it. Markdown can render
    // everything before it stably (the prior fenced blocks were paired).
    const lastFence = text.lastIndexOf("```")
    return lastFence
  }

  // 2) Lines: stop at the start of the last line. Markdown blocks (heads,
  // lists, paragraphs) finalize on newline, so prior lines are stable.
  const lastBreak = text.lastIndexOf("\n")
  if (lastBreak === -1) {
    // No newline yet — whole text is "the last line"; fall through to
    // inline scan from index 0.
    return scanInline(text, 0)
  }
  // The last line starts at lastBreak + 1. Scan inline markers in the
  // tail; any cut returned is relative to the full text.
  const lineStart = lastBreak + 1
  return scanInline(text, lineStart)
}

function scanInline(text: string, start: number): number {
  // Scan `text[start..]` for unbalanced inline markers. Anything before
  // the first unbalanced marker is stable.
  const tail = text.slice(start)
  // Inline code: backticks flip a state. Odd count → unstable, cut at
  // the last `.
  const tickCount = (tail.match(/`/g) || []).length
  let unstableAt = -1
  if (tickCount % 2 === 1) {
    unstableAt = tail.lastIndexOf("`")
  }

  // Bold/italic: count un-escaped `*` runs. We approximate: any trailing
  // run of `*` that hasn't been closed yet (no matching pair after it)
  // is unstable. Quick check: count standalone `**` and `*`.
  // Simpler approach: find the last unclosed `*` or `**` by scanning
  // from left and cutting at the unmatched opener.
  let openerStarts: number[] = []
  for (let i = 0; i < tail.length; i++) {
    if (tail[i] !== "*") continue
    const run = tail.slice(i).match(/^\*+/)
    const len = run ? run[0].length : 1
    // Treat as one marker (length 1 italic, 2 bold, 3 both). For our
    // stability check, the position matters more than the kind.
    if (openerStarts.length && tail[openerStarts[openerStarts.length - 1]] === "*") {
      // Pair off — stack pop.
      openerStarts.pop()
    } else {
      openerStarts.push(i)
    }
    i += len - 1
  }
  if (openerStarts.length > 0) {
    const earliest = openerStarts[0]
    if (unstableAt === -1 || earliest < unstableAt) {
      unstableAt = earliest
    }
  }

  // Link: `[label](url)` — if we have an opening `[` without a matching
  // closing `)`, cut at the `[`.
  let linkOpen = -1
  for (let i = 0; i < tail.length; i++) {
    if (tail[i] === "[" && tail[i - 1] !== "\\") {
      linkOpen = i
    } else if (tail[i] === ")" && linkOpen !== -1) {
      // Ensure between `[` and `)` there's a `]`. If yes, link is closed.
      const between = tail.slice(linkOpen, i + 1)
      if (between.includes("](")) linkOpen = -1
    }
  }
  if (linkOpen !== -1) {
    if (unstableAt === -1 || linkOpen < unstableAt) {
      unstableAt = linkOpen
    }
  }

  if (unstableAt === -1) return text.length
  return start + unstableAt
}

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
  search_project_ideas: "studio.toolSearch",
  search_project_build_prompt: "studio.toolSearch",
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
  /** Whether new content can still arrive. When false, the typewriter drains
   * the existing buffer at human pace and then signals `onCaughtUp`. */
  live?: boolean
  /** Called once the live tail has been fully revealed and the parent can
   * swap the persisted message bubble in. */
  onCaughtUp?: () => void
}

export const StreamSegments = memo(function StreamSegments({
  segments,
  thinking,
  onStop,
  onPreviewFile,
  live,
  onCaughtUp,
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
        // Last text-segment index — only that one is "live" / drains.
        let lastTextIdx = -1
        for (let k = segments.length - 1; k >= 0; k--) {
          if (segments[k].type === "text") { lastTextIdx = k; break }
        }
        // `live` from parent (true while broker is still streaming). When
        // omitted, fall back to the legacy heuristic (onStop defined).
        const isStreaming = live ?? !!onStop
        while (i < segments.length) {
          const seg = segments[i]

          if (seg.type === "text") {
            const isTail = i === lastTextIdx
            const animate = isStreaming && isTail
            // Non-tail text segments must snap to full immediately so we
            // don't end up with two typewriters running in parallel when
            // the agent emits a second text block (e.g. "I'll do X" →
            // tool → "Done"). Only the current tail gets the human-paced
            // reveal; everything before it is already history.
            rendered.push(
              <div key={i} className={s.textSegment}>
                <TypewriterMarkdown
                  content={seg.content}
                  animate={animate}
                  forceComplete={!isTail}
                  onCaughtUp={isTail ? onCaughtUp : undefined}
                />
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
