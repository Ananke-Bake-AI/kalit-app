"use client"

import { HeroPromptChat } from "@/components/hero-prompt-chat"
import { Icon } from "@/components/icon"
import { useAnimatedPlaceholder } from "@/hooks/use-animated-placeholder"
import { localePath } from "@/lib/i18n"
import { suiteEntryUrl, suiteMarketingLoginHref } from "@/lib/suite-marketing-entry"
import { MARKETING_MARKETING_PATH } from "@/lib/suite-marketing-paths"
import { useI18n } from "@/stores/i18n"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useCallback, useRef, useState } from "react"
import s from "./suite-landing-hero.module.scss"

const BUTTONS = [
  { icon: "hugeicons:user-ai", label: "Lead generation" },
  { icon: "hugeicons:chart-average", label: "Traffic" },
  { icon: "hugeicons:chart-breakout-square", label: "Conversion" },
  { icon: "hugeicons:chart-relationship", label: "Retargeting" }
]

export interface MarketingHeroPromptProps {
  suiteAppUrl: string
  marketingPath?: string
}

export function MarketingHeroPrompt({
  suiteAppUrl,
  marketingPath = MARKETING_MARKETING_PATH
}: MarketingHeroPromptProps) {
  const router = useRouter()
  const { status } = useSession()
  const { locale, t } = useI18n()
  const [promptValue, setPromptValue] = useState("")
  const promptRef = useRef<HTMLTextAreaElement | null>(null)

  const placeholders = [
    t("suiteLanding.marketingPlaceholder1"),
    t("suiteLanding.marketingPlaceholder2"),
    t("suiteLanding.marketingPlaceholder3"),
    t("suiteLanding.marketingPlaceholder4")
  ]

  const { handleFocus, handleBlur } = useAnimatedPlaceholder(promptRef, {
    phrases: placeholders,
    focusedPlaceholder: t("suiteLanding.marketingPlaceholder")
  })

  const handleSubmit = useCallback(() => {
    const trimmed = promptValue.trim()
    if (!trimmed) return
    if (status === "loading") return
    if (status === "authenticated") {
      window.location.assign(suiteEntryUrl(suiteAppUrl, { prompt: trimmed }))
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
        placeholder={t("suiteLanding.marketingPlaceholder")}
        onChange={(e) => setPromptValue(e.target.value)}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        onSend={handleSubmit}
        sendLabel={t("suiteLanding.marketingSendLabel")}
        sendLogoId="marketing"
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
        {t("suiteLanding.marketingMention")}
      </p>
    </>
  )
}
