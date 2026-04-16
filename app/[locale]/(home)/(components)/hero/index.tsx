"use client"

import { Container } from "@/components/container"
import { HeroPromptChat, heroPromptChatStyles as promptChat } from "@/components/hero-prompt-chat"
import { Icon } from "@/components/icon"
import { Logo } from "@/components/logo"
import { Powered } from "@/components/models/powered"
import { RevealText } from "@/components/reveal-text"
import { Subtitle } from "@/components/subtitle"
import { useAnimatedPlaceholder } from "@/hooks/use-animated-placeholder"
import { localePath } from "@/lib/i18n"
import { createStudioSession, studioLoginHref } from "@/lib/studio-redirect"
import { detectSuiteFromPrompt, getHeroPromptSuites, getSuiteDisplayTitle, type SuiteConfig } from "@/lib/suites"
import { useI18n } from "@/stores/i18n"
import { useGSAP } from "@gsap/react"
import gsap from "gsap"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useCallback, useRef, useState } from "react"
import s from "./hero.module.scss"
import { Lines } from "./lines"

const PLACEHOLDER_KEYS = ["hero.placeholder1", "hero.placeholder2", "hero.placeholder3", "hero.placeholder4"]

export const Hero = () => {
  const router = useRouter()
  const { status } = useSession()
  const { locale, t } = useI18n()
  const PLACEHOLDERS = PLACEHOLDER_KEYS.map((k) => t(k))
  const [promptValue, setPromptValue] = useState("")
  const [matchedSuite, setMatchedSuite] = useState<SuiteConfig | null>(null)
  const [isThinking, setIsThinking] = useState(false)
  const promptRef = useRef<HTMLTextAreaElement | null>(null)
  const titleRef = useRef<HTMLDivElement>(null)
  const hasAnimatedRef = useRef(false)

  const {
    timelineRef: promptTimelineRef,
    handleFocus: handlePromptFocus,
    handleBlur: handlePromptBlur
  } = useAnimatedPlaceholder(promptRef, {
    phrases: PLACEHOLDERS,
    focusedPlaceholder: t("hero.promptPlaceholder")
  })

  useGSAP(() => {
    const el = titleRef.current
    if (!el) return

    gsap.set(el, { visibility: "visible" })

    if (!hasAnimatedRef.current) {
      hasAnimatedRef.current = true
      gsap
        .timeline()
        .fromTo(el, { scale: 1.15 }, { scale: 1, duration: 2, ease: "back.inOut" })
        .fromTo(
          "[data-cards] > *",
          { scale: 0 },
          { scale: 1, stagger: 0.25, duration: 1, ease: "back.out", delay: 0 },
          "<0.5"
        )
    }
  }, [locale])

  const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPromptValue(e.target.value)
    if (matchedSuite) setMatchedSuite(null)
    if (isThinking) setIsThinking(false)
  }

  const handleSubmit = useCallback(async () => {
    const trimmed = promptValue.trim()
    if (!trimmed) return
    if (status === "loading") return

    // When authenticated, detect suite and go straight to Studio
    if (status === "authenticated") {
      setIsThinking(true)
      setMatchedSuite(null)
      const detected = detectSuiteFromPrompt(trimmed)
      const suiteId = (detected?.id || "flow") as import("@/lib/suites").SuiteId
      const url = await createStudioSession(trimmed, suiteId)
      router.push(localePath(url, locale))
      return
    }

    // Unauthenticated: show recommendation card
    setIsThinking(true)
    setMatchedSuite(null)
    setTimeout(() => {
      setIsThinking(false)
      setMatchedSuite(detectSuiteFromPrompt(trimmed))
    }, 800)
  }, [promptValue, status, router, locale])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleSuiteClick = useCallback(
    async (suiteId: string) => {
      const trimmed = promptValue.trim()
      if (!trimmed) return
      if (status === "loading") return
      const sid = suiteId as import("@/lib/suites").SuiteId
      if (status === "authenticated") {
        const url = await createStudioSession(trimmed, sid)
        router.push(localePath(url, locale))
        return
      }
      router.push(localePath(studioLoginHref(trimmed, sid), locale))
    },
    [promptValue, router, status, locale]
  )

  const handleQuickSelect = async (suite: SuiteConfig) => {
    setPromptValue(suite.quickPrompt)
    promptTimelineRef.current?.pause()

    // When authenticated, go straight to Studio
    if (status === "authenticated") {
      setIsThinking(true)
      const sid = suite.id as import("@/lib/suites").SuiteId
      const url = await createStudioSession(suite.quickPrompt, sid)
      router.push(localePath(url, locale))
      return
    }

    setIsThinking(true)
    setTimeout(() => {
      setIsThinking(false)
      setMatchedSuite(suite)
    }, 600)
  }

  return (
    <section className={s.hero}>
      <Container>
        <Subtitle>{t("hero.subtitle")}</Subtitle>
        <div ref={titleRef} className={s.title}>
          <RevealText tag="h1" key={`reveal-${locale}`}>
            <span>{t("hero.title1")}</span>
            <span>{t("hero.title2")}</span>
          </RevealText>
        </div>
        <div data-reveal>
          <HeroPromptChat
            layout="centered"
            textareaRef={promptRef}
            value={promptValue}
            placeholder={t("hero.promptPlaceholder")}
            onChange={handlePromptChange}
            onFocus={handlePromptFocus}
            onBlur={handlePromptBlur}
            onKeyDown={handleKeyDown}
            onSend={handleSubmit}
            sendLabel={t("hero.findMySuite")}
            sendLogoId="kalit"
            footer={
              <>
                <Lines />
                <div className={promptChat.quick}>
                  {getHeroPromptSuites().map((suite) => (
                    <button
                      key={suite.id}
                      type="button"
                      style={{ "--suite-color": suite.color } as React.CSSProperties}
                      onClick={() => handleQuickSelect(suite)}
                    >
                      <span className={promptChat.quickIcon}>
                        <Logo id={suite.id} />
                      </span>
                      <span>{getSuiteDisplayTitle(suite)}</span>
                    </button>
                  ))}
                </div>
              </>
            }
          >
            {isThinking ? (
              <div className={promptChat.thinking}>
                <div className={promptChat.dots}>
                  <span />
                  <span />
                  <span />
                </div>
                <span>{t("hero.analyzing")}</span>
              </div>
            ) : null}

            {matchedSuite && !isThinking ? (
              <div className={promptChat.result} style={{ "--suite-color": matchedSuite.color } as React.CSSProperties}>
                <div className={promptChat.resultHeader}>
                  <Icon icon="hugeicons:sparkles" />
                  <span>{t("hero.recommended")}</span>
                </div>
                <button
                  className={promptChat.resultCard}
                  type="button"
                  onClick={() => handleSuiteClick(matchedSuite.id)}
                >
                  <div className={promptChat.resultIcon}>
                    <Logo id={matchedSuite.id} />
                  </div>
                  <div className={promptChat.resultInfo}>
                    <strong>Kalit {getSuiteDisplayTitle(matchedSuite)}</strong>
                    <span>{matchedSuite.matchDescription}</span>
                  </div>
                  <Icon icon="hugeicons:arrow-right-02" className={promptChat.resultArrow} />
                </button>
              </div>
            ) : null}
          </HeroPromptChat>
        </div>
        <Powered title={t("hero.poweredBy")} />
      </Container>
    </section>
  )
}
