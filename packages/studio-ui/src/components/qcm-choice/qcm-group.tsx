"use client"

import { useMemo, useState } from "react"
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
  /** When set, every question's options are read from this map. Used when a
   * persisted bubble's choices have already been picked — the group renders
   * disabled with the saved picks highlighted. */
  answers?: Record<number, string[]>
  /** Called once when the user clicks Send (or auto-fires on a single
   * single-select question with `answers` undefined). Receives the
   * synthesized user-message text. */
  onSubmit?: (text: string) => void
  /** Called if any question's "Something else…" link is clicked — host
   * should focus the chat input. */
  onRequestFreeform?: () => void
}

/**
 * Renders one or more ask_choice questions as a single interactive form.
 *
 * Single question, single-select: behaves like a standalone tap menu — the
 * first click submits immediately. Matches the old behaviour so the chat
 * doesn't feel slower for trivial clarifications.
 *
 * Multiple questions (or any multi_select): requires the user to pick from
 * each, then one Send button at the bottom submits all answers as a single
 * synthesized user message ("Bold & energetic, Photo gallery"). This matches
 * the "1, 2, 3, 4, or say something else" pattern users expect from chat
 * UIs that bundle clarifiers.
 *
 * `answers` prop locks the form in answered state with the saved picks
 * highlighted — used when re-rendering the persisted bubble after the user
 * already submitted.
 */
export function QcmGroup({ questions, answers, onSubmit, onRequestFreeform }: QcmGroupProps) {
  const { t } = useI18n()
  // picks[i] is the array of option labels selected for question i (1 entry
  // for single-select, N for multi).
  const [picks, setPicks] = useState<Record<number, string[]>>({})

  const isAnswered = !!answers
  const groupMode = questions.length > 1 || questions.some((q) => q.multiSelect)

  const toggle = (qIdx: number, label: string) => {
    if (isAnswered) return
    const q = questions[qIdx]
    if (!q) return
    if (!q.multiSelect && !groupMode) {
      // Single question + single-select → auto-submit on click. Keep the
      // legacy fast-path for trivial cases.
      onSubmit?.(label)
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
        // Single-select within a group: replace the pick.
        next[qIdx] = [label]
      }
      return next
    })
  }

  // All required questions answered (single-select always requires 1; multi
  // requires at least 1). Used to enable the Send button.
  const ready = useMemo(() => {
    if (!groupMode) return false
    return questions.every((_, i) => (picks[i]?.length ?? 0) > 0)
  }, [groupMode, picks, questions])

  const submitAll = () => {
    if (isAnswered || !ready) return
    // Concatenate picks across all questions into one message line. Order
    // follows the questions array. Each question's labels are comma-joined,
    // and questions are joined by " · " so the model can parse if it wants.
    // For backward compat with single-select-alone, we use the same
    // comma-joined format.
    const parts: string[] = []
    questions.forEach((_, i) => {
      const labels = picks[i] ?? []
      if (labels.length > 0) parts.push(labels.join(", "))
    })
    onSubmit?.(parts.join(" · "))
  }

  // For each question, what's selected? Reads from `answers` when locked,
  // otherwise from local state.
  const selectedFor = (qIdx: number): string[] => {
    if (isAnswered) return answers?.[qIdx] ?? []
    return picks[qIdx] ?? []
  }

  // Hide any freeform link until we know the user wants one — there's only
  // a single shared "Something else…" link at the bottom of the group.
  const anyFreeform = !isAnswered && questions.some((q) => q.freeform !== false)

  return (
    <div className={s.container} data-answered={isAnswered ? "true" : "false"}>
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
          </div>
        )
      })}

      {groupMode && !isAnswered && (
        <div className={s.actions}>
          <button
            type="button"
            className={s.confirmBtn}
            onClick={submitAll}
            disabled={!ready}
          >
            {t("studio.send") || "Send"}
          </button>
        </div>
      )}

      {anyFreeform && onRequestFreeform && (
        <button type="button" className={s.freeformLink} onClick={onRequestFreeform}>
          {t("studio.somethingElse") || "Something else…"}
        </button>
      )}
    </div>
  )
}
