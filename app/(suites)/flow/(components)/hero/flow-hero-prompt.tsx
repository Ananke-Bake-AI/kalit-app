"use client"

import { HeroPromptChat } from "@/components/hero-prompt-chat"
import { Icon } from "@/components/icon"
import { useAnimatedPlaceholder } from "@/hooks/use-animated-placeholder"
import { flowLoginHref, flowSuiteEntryUrl } from "@/lib/flow-suite-entry"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { useCallback, useRef, useState } from "react"
import s from "./hero.module.scss"

const PLACEHOLDERS = [
  "A landing page for my product with hero, features, and pricing...",
  "A portfolio with project grid, about section, and contact form...",
  "A simple marketing site with newsletter signup and blog...",
  "An event page with schedule, speakers, and registration CTA..."
]

const BUTTONS = [
  {
    icon: "hugeicons:rocket-01",
    label: "Startup"
  },
  {
    icon: "hugeicons:test-tube-01",
    label: "SaaS"
  },
  {
    icon: "hugeicons:user-story",
    label: "Portfolio"
  },
  {
    icon: "hugeicons:serving-food",
    label: "Restaurant"
  },
  {
    icon: "hugeicons:game-controller-01",
    label: "Game"
  }
]

interface FlowHeroPromptProps {
  suiteAppUrl: string
}

export function FlowHeroPrompt({ suiteAppUrl }: FlowHeroPromptProps) {
  const router = useRouter()
  const { status } = useSession()
  const [promptValue, setPromptValue] = useState("")
  const promptRef = useRef<HTMLTextAreaElement | null>(null)
  const { handleFocus, handleBlur } = useAnimatedPlaceholder(promptRef, {
    phrases: PLACEHOLDERS,
    focusedPlaceholder: "Describe the site you want to build..."
  })

  const handleSubmit = useCallback(() => {
    const trimmed = promptValue.trim()
    if (!trimmed) return
    if (status === "loading") return
    if (status === "authenticated") {
      window.location.assign(flowSuiteEntryUrl(suiteAppUrl, { prompt: trimmed }))
      return
    }
    router.push(flowLoginHref({ prompt: trimmed }))
  }, [promptValue, router, status, suiteAppUrl])

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
        placeholder="Describe the site you want to build..."
        onChange={(e) => setPromptValue(e.target.value)}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        onSend={handleSubmit}
        sendLabel="Start building"
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
        Describe it. Drop your files. Flow generates, previews, and packages your project automatically. No friction. No
        code. Just results.
      </p>
    </>
  )
}
