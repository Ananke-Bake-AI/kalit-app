"use client"

import { useEffect, useMemo, useRef, useState } from "react"
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

  // True after the user clicked Send while streaming — they need feedback
  // that the click registered even though the network call hasn't gone out.
  const [queued, setQueued] = useState(false)

  // If isStreaming flips off (agent done), reset queued state so the next
  // click submits normally.
  const wasStreaming = useRef(isStreaming)
  useEffect(() => {
    if (wasStreaming.current && !isStreaming) {
      setQueued(false)
    }
    wasStreaming.current = isStreaming
  }, [isStreaming])

  // Persist picks whenever they change (interactive only).
  useEffect(() => {
    if (isAnswered) return
    saveDraft(draftKey, picks)
  }, [draftKey, isAnswered, picks])

  const toggle = (qIdx: number, label: string) => {
    if (isAnswered || queued) return
    const q = questions[qIdx]
    if (!q) return
    if (!q.multiSelect && !groupMode) {
      // Single question + single-select → submit immediately, keeping the
      // legacy fast-path for trivial cases.
      handleSubmit({ [qIdx]: [label] })
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
    if (isAnswered) return
    const text = synthesizeMessage(questions, picksToSend)
    if (!text) return
    onSubmit?.(text)
    clearDraft(draftKey)
    if (isStreaming) {
      setQueued(true)
    }
  }

  const submitAll = () => {
    if (!ready || queued) return
    handleSubmit(picks)
  }

  const selectedFor = (qIdx: number): string[] => {
    if (isAnswered) return answers?.[qIdx] ?? []
    return picks[qIdx] ?? []
  }

  const sendLabel = isStreaming || queued ? tx("studio.sendQueued", "Send (queued)") : tx("studio.send", "Send")
  const freeformLabel = tx("studio.somethingElse", "Something else…")

  return (
    <div
      className={s.container}
      data-answered={isAnswered ? "true" : "false"}
      data-group={groupMode ? "true" : "false"}
    >
      <div className={s.scrollArea}>
        {questions.map((q, qIdx) => {
          const sel = selectedFor(qIdx)
          const useChecks = q.multiSelect || groupMode
          return (
            <div key={qIdx} className={s.questionBlock}>
              <p className={s.question}>{q.question}</p>
              <div className={useChecks ? s.checkGrid : s.buttonGrid}>
                {q.options.map((opt) => {
                  const isSel = sel.includes(opt.label)
                  return (
                    <button
                      key={opt.label}
                      type="button"
                      className={useChecks ? s.checkOption : s.buttonOption}
                      data-selected={isSel ? "true" : "false"}
                      onClick={() => toggle(qIdx, opt.label)}
                      disabled={isAnswered}
                      title={opt.description}
                    >
                      {useChecks && (
                        <span className={s.checkBox} aria-hidden>
                          {isSel ? <Icon icon="hugeicons:tick-02" /> : null}
                        </span>
                      )}
                      <span className={s.optionBody}>
                        <span className={s.optionLabel}>{opt.label}</span>
                        {opt.description && <span className={s.optionDescription}>{opt.description}</span>}
                      </span>
                    </button>
                  )
                })}
              </div>
              {!isAnswered && q.freeform !== false && onRequestFreeform && (
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

      {!isAnswered && groupMode && (
        <div className={s.actions}>
          <button
            type="button"
            className={s.confirmBtn}
            onClick={submitAll}
            disabled={!ready || queued}
            data-queued={queued ? "true" : "false"}
          >
            {queued && <Icon icon="hugeicons:tick-02" aria-hidden />}
            <span>{sendLabel}</span>
          </button>
        </div>
      )}
    </div>
  )
}
