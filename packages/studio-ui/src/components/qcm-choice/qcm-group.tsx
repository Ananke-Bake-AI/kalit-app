"use client"

import { useEffect, useMemo, useState } from "react"
import { Icon } from "../../primitives/icon"
import { useI18n } from "@kalit/i18n/react"
import s from "./qcm-choice.module.scss"

export interface QcmOption {
  label: string
  description?: string
}

export interface QcmQuestion {
  question: string
  options: QcmOption[]
  multiSelect?: boolean
  freeform?: boolean
}

export interface QcmGroupProps {
  questions: QcmQuestion[]
  /** When set, every question's options are read from this map. Persisted
   * bubble after the user has submitted: render disabled with their picks
   * highlighted. */
  answers?: Record<number, string[]>
  /** Synthesizes the user-message text from picks and submits. */
  onSubmit?: (text: string) => void
  /** "Aucune ne convient" / "Something else" — focuses the chat input so
   * the user can type a freeform answer. Receives the specific question the
   * link sits under, so the host can prefill an attributable answer
   * (`For "<question>": `) when several questions are stacked. */
  onRequestFreeform?: (question?: string) => void
  /** True while the agent is still streaming. The form stays interactive
   * (the host queues the synthesized message), and the Send button shows
   * a "queued" affordance. */
  isStreaming?: boolean
  /** Stable identity for this group across re-mounts. When the QCM bubble
   * swaps from live-stream to persisted view, the same key keeps the
   * picks in sessionStorage so the user doesn't lose their selection. */
  draftKey?: string
}

// ---------------------------------------------------------------------------
// Synthesized-message format
// ---------------------------------------------------------------------------

/**
 * Build the user-message text the host will POST to the broker. Each picked
 * option contributes its question, label, AND description — the model used
 * to receive just "Playful moderne · Tokenomics & features" with no context,
 * leaving it to guess what those labels really meant. Now it sees:
 *
 *   - Quelle ambiance pour le site ?: Playful moderne (Fun mais maîtrisé, design propre avec touches humoristiques)
 *   - Focus principal du site ?: La pièce humoristique (Showcase de l'humour et de la communauté)
 *
 * which preserves the full intent including any nuance the option's
 * description carried.
 */
function synthesizeMessage(
  questions: QcmQuestion[],
  picks: Record<number, string[]>,
): string {
  const lines: string[] = []
  questions.forEach((q, i) => {
    const labels = picks[i] ?? []
    if (labels.length === 0) return
    const pieces = labels.map((lbl) => {
      const opt = q.options.find((o) => o.label === lbl)
      return opt?.description ? `${opt.label} (${opt.description})` : opt?.label ?? lbl
    })
    lines.push(`- ${q.question}: ${pieces.join(", ")}`)
  })
  return lines.join("\n")
}

// ---------------------------------------------------------------------------
// Draft persistence
// ---------------------------------------------------------------------------

const DRAFT_PREFIX = "kalit-studio-qcm-draft:"

function loadDraft(draftKey?: string): Record<number, string[]> {
  if (!draftKey || typeof window === "undefined") return {}
  try {
    const raw = window.sessionStorage.getItem(DRAFT_PREFIX + draftKey)
    return raw ? (JSON.parse(raw) as Record<number, string[]>) : {}
  } catch {
    return {}
  }
}

function saveDraft(draftKey: string | undefined, picks: Record<number, string[]>): void {
  if (!draftKey || typeof window === "undefined") return
  try {
    window.sessionStorage.setItem(DRAFT_PREFIX + draftKey, JSON.stringify(picks))
  } catch {
    // sessionStorage may be unavailable (private mode); silent best-effort.
  }
}

function clearDraft(draftKey?: string): void {
  if (!draftKey || typeof window === "undefined") return
  try {
    window.sessionStorage.removeItem(DRAFT_PREFIX + draftKey)
  } catch {
    /* noop */
  }
}

// "Sent" marker — set the moment the user submits, persisted per draftKey.
// The live QCM re-renders on every SSE event while the agent streams; without
// persisting this, a re-mount would reset the local "submitted" state, the
// user's pick would look un-registered, and a second click could double-queue
// the send. Surviving the re-mount keeps the picked option highlighted with a
// clear "queued / sent" affordance and blocks re-submits.
const SENT_PREFIX = "kalit-studio-qcm-sent:"

function loadSent(draftKey?: string): boolean {
  if (!draftKey || typeof window === "undefined") return false
  try {
    return window.sessionStorage.getItem(SENT_PREFIX + draftKey) === "1"
  } catch {
    return false
  }
}

function saveSent(draftKey?: string): void {
  if (!draftKey || typeof window === "undefined") return
  try {
    window.sessionStorage.setItem(SENT_PREFIX + draftKey, "1")
  } catch {
    /* noop */
  }
}

function clearSent(draftKey?: string): void {
  if (!draftKey || typeof window === "undefined") return
  try {
    window.sessionStorage.removeItem(SENT_PREFIX + draftKey)
  } catch {
    /* noop */
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Renders one or more ask_choice questions as a compact, single-form QCM.
 *
 * Layout: each question is rendered as a column of compact two-line option
 * chips (label + smaller description). The whole group has a
 * `max-height: 55vh` with internal scroll, so even 3-question forms never
 * dominate the chat viewport — the user can always see the bot's framing
 * sentence above.
 *
 * Sending:
 *  - Single isolated single-select question → first click submits immediately.
 *  - Multiple questions or any multi_select → pick per question, click Send.
 *  - During streaming, Send is still clickable; the host queues the message
 *    and fires it when the agent's run wraps up (the QCM shows a "queued"
 *    chip on the Send button so the user knows it's coming).
 *  - Picks are persisted to sessionStorage per draftKey so the swap from
 *    live-stream to persisted message bubble doesn't lose the selection.
 *
 * Escape hatch: a "Aucune ne convient" link focuses the chat input so the
 * user can type a freeform answer when no option fits.
 */
export function QcmGroup({
  questions,
  answers,
  onSubmit,
  onRequestFreeform,
  isStreaming,
  draftKey,
}: QcmGroupProps) {
  const { t } = useI18n()
  // useI18n.t() returns the raw key when no translation exists; fall through
  // to the English default in that case.
  const tx = (key: string, fallback: string): string => {
    const v = t(key)
    return v && v !== key ? v : fallback
  }

  const isAnswered = !!answers
  const groupMode = questions.length > 1 || questions.some((q) => q.multiSelect)

  // Hydrate picks from sessionStorage so the live→persisted bubble swap
  // doesn't blow away the user's selection. Locked QCMs (answers prop set)
  // never read from draft — they're already final.
  const [picks, setPicks] = useState<Record<number, string[]>>(() =>
    isAnswered ? {} : loadDraft(draftKey),
  )

  // True once the user has submitted this QCM (sent immediately, or queued
  // while the agent is still streaming). Persisted per draftKey so the live
  // re-render on each SSE event doesn't reset it — keeps the pick highlighted
  // with a clear affordance and blocks a double-submit.
  const [submitted, setSubmitted] = useState<boolean>(() =>
    isAnswered ? false : loadSent(draftKey),
  )

  // Once the persisted (answered) bubble takes over, drop the live draft +
  // sent markers so a brand-new QCM with the same draftKey starts clean.
  useEffect(() => {
    if (isAnswered) {
      clearDraft(draftKey)
      clearSent(draftKey)
    }
  }, [isAnswered, draftKey])

  // Persist picks whenever they change (interactive only).
  useEffect(() => {
    if (isAnswered) return
    saveDraft(draftKey, picks)
  }, [draftKey, isAnswered, picks])

  const toggle = (qIdx: number, label: string) => {
    if (isAnswered || submitted) return
    const q = questions[qIdx]
    if (!q) return
    if (!q.multiSelect && !groupMode) {
      // Single-select: record the pick (so it stays highlighted through the
      // live re-render) AND submit in one tap.
      const next = { [qIdx]: [label] }
      setPicks(next)
      handleSubmit(next)
      return
    }
    setPicks((prev) => {
      const next = { ...prev }
      const current = next[qIdx] ?? []
      if (q.multiSelect) {
        next[qIdx] = current.includes(label)
          ? current.filter((l) => l !== label)
          : [...current, label]
      } else {
        next[qIdx] = [label]
      }
      return next
    })
  }

  // Ready as soon as ANY question has a pick. The user shouldn't be forced
  // to answer every stacked clarifier to send — synthesizeMessage already
  // drops the unanswered ones, so a partial reply is well-formed and the
  // agent can re-ask or proceed with what it got.
  const ready = useMemo(() => {
    if (!groupMode) return false
    return questions.some((_, i) => (picks[i]?.length ?? 0) > 0)
  }, [groupMode, picks, questions])

  const handleSubmit = (picksToSend: Record<number, string[]>) => {
    if (isAnswered || submitted) return
    const text = synthesizeMessage(questions, picksToSend)
    if (!text) return
    onSubmit?.(text)
    saveSent(draftKey)
    setSubmitted(true)
    // Keep the draft (picks) so the chosen option stays highlighted until the
    // persisted bubble swaps in — cleared by the isAnswered effect.
  }

  const submitAll = () => {
    if (!ready || submitted) return
    handleSubmit(picks)
  }

  const selectedFor = (qIdx: number): string[] => {
    if (isAnswered) return answers?.[qIdx] ?? []
    return picks[qIdx] ?? []
  }

  // While the agent is still streaming a submit is queued (drains when the run
  // closes); otherwise it sends right away. Either way show the user it landed.
  const sendLabel = submitted
    ? isStreaming
      ? tx("studio.sendQueued", "Queued — sending when ready")
      : tx("studio.sent", "Sent")
    : tx("studio.send", "Send")
  const freeformLabel = tx("studio.somethingElse", "Something else…")
  // Locked = submitted or already-answered: no more interaction, picks shown.
  const locked = isAnswered || submitted

  return (
    <div
      className={s.container}
      data-answered={isAnswered ? "true" : "false"}
      data-group={groupMode ? "true" : "false"}
      data-locked={locked ? "true" : "false"}
    >
      <div className={s.scrollArea}>
        {questions.map((q, qIdx) => {
          const sel = selectedFor(qIdx)
          const multi = !!q.multiSelect
          return (
            <div key={qIdx} className={s.questionBlock}>
              <p className={s.question}>{q.question}</p>
              <div className={s.optionsGrid}>
                {q.options.map((opt) => {
                  const isSel = sel.includes(opt.label)
                  return (
                    <button
                      key={opt.label}
                      type="button"
                      className={s.option}
                      data-selected={isSel ? "true" : "false"}
                      data-multi={multi ? "true" : "false"}
                      onClick={() => toggle(qIdx, opt.label)}
                      disabled={locked}
                      title={opt.description}
                    >
                      {multi && (
                        <span className={s.optionMark} aria-hidden>
                          {isSel ? <Icon icon="hugeicons:tick-02" /> : null}
                        </span>
                      )}
                      <span className={s.optionBody}>
                        <span className={s.optionLabel}>{opt.label}</span>
                        {opt.description && <span className={s.optionDescription}>{opt.description}</span>}
                      </span>
                      {!multi && isSel && (
                        <span className={s.optionCheck} aria-hidden>
                          <Icon icon="hugeicons:tick-02" />
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
              {!locked && q.freeform !== false && onRequestFreeform && (
                <button
                  type="button"
                  className={s.freeformLink}
                  onClick={() => onRequestFreeform(q.question)}
                >
                  {freeformLabel}
                </button>
              )}
            </div>
          )
        })}
      </div>

      {!isAnswered && (
        <div className={s.actions}>
          {groupMode && !submitted && (
            <button
              type="button"
              className={s.confirmBtn}
              onClick={submitAll}
              disabled={!ready}
            >
              <span>{tx("studio.send", "Send")}</span>
            </button>
          )}
          {submitted && (
            <span
              className={s.sentNote}
              data-streaming={isStreaming ? "true" : "false"}
              role="status"
            >
              <Icon icon="hugeicons:tick-02" aria-hidden />
              <span>{sendLabel}</span>
            </span>
          )}
        </div>
      )}
    </div>
  )
}
