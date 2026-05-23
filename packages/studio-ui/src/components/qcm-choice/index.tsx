"use client"

import { useState } from "react"
import { Icon } from "../../primitives/icon"
import { useI18n } from "@kalit/i18n/react"
import s from "./qcm-choice.module.scss"

export interface QcmOption {
  label: string
  description?: string
}

export interface QcmChoiceProps {
  question: string
  options: QcmOption[]
  multiSelect?: boolean
  freeform?: boolean
  /** Already answered — render disabled with the user's pick highlighted. */
  answered?: boolean
  /** Called when the user picks. Single-select fires immediately; multi-select
   * fires when the user presses Confirm. The labels argument is what gets
   * submitted to the broker as a synthesized user message. */
  onSubmit: (labels: string[]) => void
  /** Fired when the user clicks "Something else…". Should open a freeform
   * input — for v1 the chat input itself handles it (focus the textarea). */
  onRequestFreeform?: () => void
}

/**
 * Renders an ask_choice prompt as buttons (single-select) or checkboxes
 * (multi-select). One click on a single-select button immediately submits as
 * a user message — no Confirm step. Multi-select shows checkboxes + a
 * Confirm button so the user can review their picks before sending.
 *
 * Replaces the freeform markdown bullet question lists the model used to
 * emit ("What's the vibe? - A: cozy - B: bold - C: minimal"). Studio used
 * to force the user to type the answer in prose; now it's one tap.
 */
export function QcmChoice({
  question,
  options,
  multiSelect,
  freeform = true,
  answered,
  onSubmit,
  onRequestFreeform,
}: QcmChoiceProps) {
  const { t } = useI18n()
  const [picked, setPicked] = useState<Set<string>>(new Set())

  const isAnswered = !!answered

  const toggle = (label: string) => {
    if (isAnswered) return
    if (!multiSelect) {
      // Single-select: submit immediately on click.
      onSubmit([label])
      return
    }
    setPicked((prev) => {
      const next = new Set(prev)
      if (next.has(label)) next.delete(label)
      else next.add(label)
      return next
    })
  }

  const confirm = () => {
    if (isAnswered || picked.size === 0) return
    onSubmit(Array.from(picked))
  }

  return (
    <div className={s.container} data-answered={isAnswered ? "true" : "false"}>
      <p className={s.question}>{question}</p>
      <div className={multiSelect ? s.checkGrid : s.buttonGrid}>
        {options.map((opt) => {
          const selected = picked.has(opt.label)
          return (
            <button
              key={opt.label}
              type="button"
              className={multiSelect ? s.checkOption : s.buttonOption}
              data-selected={selected ? "true" : "false"}
              onClick={() => toggle(opt.label)}
              disabled={isAnswered}
            >
              {multiSelect && (
                <span className={s.checkBox} aria-hidden>
                  {selected ? <Icon icon="hugeicons:tick-02" /> : null}
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
      {multiSelect && !isAnswered && (
        <div className={s.actions}>
          <button
            type="button"
            className={s.confirmBtn}
            onClick={confirm}
            disabled={picked.size === 0}
          >
            {t("studio.confirm") || "Confirm"}
          </button>
        </div>
      )}
      {freeform && !isAnswered && onRequestFreeform && (
        <button type="button" className={s.freeformLink} onClick={onRequestFreeform}>
          {t("studio.somethingElse") || "Something else…"}
        </button>
      )}
    </div>
  )
}
