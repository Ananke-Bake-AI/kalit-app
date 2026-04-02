"use client"

import { HeroPromptChat } from "@/components/hero-prompt-chat"
import { Icon } from "@/components/icon"
import { useAnimatedPlaceholder } from "@/hooks/use-animated-placeholder"
import { FLOW_MARKETING_PATH } from "@/lib/flow-suite-entry"
import { localePath } from "@/lib/i18n"
import { suiteEntryUrl, suiteMarketingLoginHref } from "@/lib/suite-marketing-entry"
import { useI18n } from "@/stores/i18n"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { useCallback, useRef, useState } from "react"
import s from "./suite-landing-hero.module.scss"

const BUTTONS = [
  { icon: "hugeicons:rocket-01", label: "Startup" },
  { icon: "hugeicons:test-tube-01", label: "SaaS" },
  { icon: "hugeicons:user-story", label: "Portfolio" },
  { icon: "hugeicons:serving-food", label: "Restaurant" },
  { icon: "hugeicons:game-controller-01", label: "Game" }
]

export interface FlowHeroPromptProps {
  suiteAppUrl: string
  marketingPath?: string
}

export function FlowHeroPrompt({ suiteAppUrl, marketingPath = FLOW_MARKETING_PATH }: FlowHeroPromptProps) {
  const router = useRouter()
  const { status } = useSession()
  const { locale, t } = useI18n()
  const [promptValue, setPromptValue] = useState("")
  const promptRef = useRef<HTMLTextAreaElement | null>(null)

  const placeholders = [
    t("suiteLanding.flowPlaceholder1"),
    t("suiteLanding.flowPlaceholder2"),
    t("suiteLanding.flowPlaceholder3"),
    t("suiteLanding.flowPlaceholder4")
  ]

  const { handleFocus, handleBlur } = useAnimatedPlaceholder(promptRef, {
    phrases: placeholders,
    focusedPlaceholder: t("suiteLanding.flowPlaceholder")
  })

  const handleSubmit = useCallback(async () => {
    const trimmed = promptValue.trim()
    if (!trimmed) return
    if (status === "loading") return
    if (status === "authenticated") {
      try {
        const res = await fetch("/api/suite/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ suiteId: "flow" })
        })
        if (res.ok) {
          const { token } = await res.json()
          const callbackUrl = `${suiteAppUrl}/api/auth/sso/callback?token=${encodeURIComponent(token)}&redirect=${encodeURIComponent("/?prompt=" + encodeURIComponent(trimmed))}`
          window.open(callbackUrl, "_blank")
          return
        }
      } catch {
        // Fallback
      }
      window.open(suiteEntryUrl(suiteAppUrl, { prompt: trimmed }), "_blank")
      return
    }
    router.push(localePath(suiteMarketingLoginHref(marketingPath, { prompt: trimmed }), locale))
  }, [marketingPath, promptValue, router, status, suiteAppUrl])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <>
      <HeroPromptChat
        layout="flush"
        textareaRef={promptRef}
        value={promptValue}
        placeholder={t("suiteLanding.flowPlaceholder")}
        onChange={(e) => setPromptValue(e.target.value)}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        onSend={handleSubmit}
        sendLabel={t("suiteLanding.flowSendLabel")}
        sendLogoId="flow"
        showBlurBackground={false}
      />
      <div className={s.buttons}>
        {BUTTONS.map((button) => (
          <button key={button.label} type="button" className={s.btn}>
            <Icon icon={button.icon} />
            {button.label}
          </button>
        ))}
      </div>
      <p className={s.mention}>
        {t("suiteLanding.flowMention")}
      </p>
    </>
  )
}
