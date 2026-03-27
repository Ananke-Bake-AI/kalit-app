"use client"

import { Color4Bg } from "@/components/color4bg"
import { Icon } from "@/components/icon"
import { Logo } from "@/components/logo"
import type { SuiteId } from "@/lib/suites"
import clsx from "clsx"
import {
  type ChangeEvent,
  type KeyboardEvent,
  type ReactNode,
  type RefObject
} from "react"
import s from "./hero-prompt-chat.module.scss"

/** Classes pour étendre le bloc (raccourcis, carte suite, etc.) sans second chemin d’import */
export const heroPromptChatStyles = s

export type HeroPromptSendLogoId = "kalit" | SuiteId

export interface HeroPromptChatProps {
  layout?: "centered" | "flush"
  className?: string
  textareaRef: RefObject<HTMLTextAreaElement | null>
  value: string
  placeholder: string
  onChange: (e: ChangeEvent<HTMLTextAreaElement>) => void
  onFocus: () => void
  onBlur: () => void
  onKeyDown: (e: KeyboardEvent<HTMLTextAreaElement>) => void
  onSend: () => void
  sendLabel: string
  sendLogoId: HeroPromptSendLogoId
  /** Contenu sous les actions (ex. état « analyzing », carte suite) */
  children?: ReactNode
  /** Sous le formulaire, avant le fond (ex. raccourcis suites homepage) */
  footer?: ReactNode
  showBlurBackground?: boolean
}

export function HeroPromptChat({
  layout = "centered",
  className,
  textareaRef,
  value,
  placeholder,
  onChange,
  onFocus,
  onBlur,
  onKeyDown,
  onSend,
  sendLabel,
  sendLogoId,
  children,
  footer,
  showBlurBackground = true
}: HeroPromptChatProps) {
  const canSend = Boolean(value.trim())

  return (
    <div
      className={clsx(
        s.wrapper,
        layout === "centered" && s.wrapper_centered,
        layout === "flush" && s.wrapper_flush,
        className
      )}
    >
      <div className={s.form}>
        <div className={s.shell}>
          <div className={s.inputRow}>
            <Icon icon="hugeicons:message-edit-01" className={s.inputIcon} />
            <textarea
              ref={textareaRef}
              value={value}
              onChange={onChange}
              onFocus={onFocus}
              onBlur={onBlur}
              onKeyDown={onKeyDown}
              placeholder={placeholder}
              rows={3}
            />
          </div>
          <div className={s.bottom}>
            <button className={s.mic} type="button">
              <Icon icon="hugeicons:mic-02" />
            </button>
            <button className={s.send} type="button" onClick={onSend} disabled={!canSend}>
              <Logo id={sendLogoId} />
              <span>{sendLabel}</span>
            </button>
          </div>
          {children}
        </div>
      </div>

      {footer}

      {showBlurBackground ? (
        <div className={s.bg} aria-hidden>
          <Color4Bg style="blur-gradient" />
        </div>
      ) : null}
    </div>
  )
}
