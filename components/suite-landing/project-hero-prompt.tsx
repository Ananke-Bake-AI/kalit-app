"use client"

import { HeroPromptChat } from "@/components/hero-prompt-chat"
import { Icon } from "@/components/icon"
import { useAnimatedPlaceholder } from "@/hooks/use-animated-placeholder"
import { localePath } from "@/lib/i18n"
import { createStudioSession, studioLoginHref } from "@/lib/studio-redirect"
import { useI18n } from "@/stores/i18n"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useCallback, useRef, useState } from "react"
import s from "./suite-landing-hero.module.scss"

const BUTTONS = [
  { icon: "hugeicons:rocket-01", label: "SaaS App" },
  { icon: "hugeicons:smart-phone-01", label: "Mobile App" },
  { icon: "hugeicons:ai-game", label: "Game" },
  { icon: "hugeicons:dashboard-square-setting", label: "Dashboard" },
  { icon: "hugeicons:api", label: "API Backend" }
]

export interface ProjectHeroPromptProps {
  suiteAppUrl?: string
}

export function ProjectHeroPrompt(_props: ProjectHeroPromptProps) {
  const router = useRouter()
  const { status } = useSession()
  const { locale, t } = useI18n()
  const [promptValue, setPromptValue] = useState("")
  const promptRef = useRef<HTMLTextAreaElement | null>(null)

  const placeholders = [
    t("suiteLanding.projectPlaceholder1"),
    t("suiteLanding.projectPlaceholder2"),
    t("suiteLanding.projectPlaceholder3"),
    t("suiteLanding.projectPlaceholder4")
  ]

  const { handleFocus, handleBlur } = useAnimatedPlaceholder(promptRef, {
    phrases: placeholders,
    focusedPlaceholder: t("suiteLanding.projectPlaceholder")
  })

  const handleSubmit = useCallback(async () => {
    const trimmed = promptValue.trim()
    if (!trimmed) return
    if (status === "loading") return
    if (status === "authenticated") {
      const url = await createStudioSession(trimmed, "project")
      router.push(localePath(url, locale))
      return
    }
    router.push(localePath(studioLoginHref(trimmed, "project"), locale))
  }, [promptValue, router, status, locale])

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
        placeholder={t("suiteLanding.projectPlaceholder")}
        onChange={(e) => setPromptValue(e.target.value)}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        onSend={handleSubmit}
        sendLabel={t("suiteLanding.projectSendLabel")}
        sendLogoId="project"
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
        {t("suiteLanding.projectMention")}
      </p>
    </>
  )
}
