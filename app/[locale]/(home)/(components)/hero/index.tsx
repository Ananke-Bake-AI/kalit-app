"use client"

import { Container } from "@/components/container"
import { HeroPromptChat, heroPromptChatStyles as promptChat } from "@/components/hero-prompt-chat"
import { Icon } from "@/components/icon"
import { Logo } from "@/components/logo"
import { Powered } from "@/components/models/powered"
import { RevealText } from "@/components/reveal-text"
import { Subtitle } from "@/components/subtitle"
import { AnimatedLine } from "@/components/svg/animated-line"
import { useAnimatedPlaceholder } from "@/hooks/use-animated-placeholder"
import { localePath } from "@/lib/i18n"
import { createStudioSession, studioLoginHref } from "@/lib/studio-redirect"
import { detectSuiteFromPrompt, getHeroPromptSuites, getSuiteDisplayTitle, type SuiteConfig } from "@/lib/suites"
import { useI18n } from "@/stores/i18n"
import { useGSAP } from "@gsap/react"
import clsx from "clsx"
import gsap from "gsap"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useCallback, useRef, useState } from "react"
import { HeroCard } from "./card"
import s from "./hero.module.scss"

const PLACEHOLDER_KEYS = [
  "hero.placeholder1",
  "hero.placeholder2",
  "hero.placeholder3",
  "hero.placeholder4"
]

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
  const cardsRef = useRef<HTMLDivElement>(null)
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

  const handleSuiteClick = useCallback(async (suiteId: string) => {
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
  }, [promptValue, router, status, locale])

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
            <span>
              {t("hero.title1")}
              <AnimatedLine
                className={clsx(s.line, s.line1)}
                viewBox="0 0 621 429"
                stroke="url(#hero_line_1)"
                d="M607.958 111.307V61.6937C607.958 31.2129 583.253 6.50125 552.772 6.49378L496.62 6.48C466.128 6.47252 441.406 31.1886 441.406 61.68V135.666C441.406 148.7 451.972 159.266 465.006 159.266C478.04 159.266 488.606 148.502 488.606 135.468C488.606 122.213 477.861 111.266 464.606 111.266H439.806C412.855 111.266 391.006 133.115 391.006 160.066L391.006 367.066C391.006 397.552 366.292 422.266 335.806 422.266H185.406C154.92 422.266 130.206 397.552 130.206 367.066V360.066C130.206 329.58 105.492 304.866 75.0061 304.866H-508"
              />
              <AnimatedLine
                className={clsx(s.line, s.line2)}
                viewBox="0 0 557 173"
                stroke="url(#hero_line_2)"
                d="M6.48047 111.28L6.48047 61.6801C6.48047 31.1939 31.1943 6.48001 61.6805 6.48001H128.68C152.76 6.48001 172.28 26.0004 172.28 50.08C172.28 74.1596 191.801 93.6799 215.88 93.6799H369.98C384.837 93.6799 396.88 81.4121 396.88 66.5556C396.88 51.9448 385.036 39.8798 370.425 39.8798C355.815 39.8798 343.97 51.7242 343.97 66.335V110.68C343.97 141.166 368.684 165.88 399.17 165.88H966.594"
              />
            </span>
            <span>
              {t("hero.title2")}
              <AnimatedLine
                className={clsx(s.line, s.line3)}
                viewBox="0 0 557 253"
                stroke="url(#hero_line_3)"
                d="M543.646 177.32V190.92C543.646 221.406 518.932 246.12 488.446 246.12L330.846 246.12C300.36 246.12 275.646 221.406 275.646 190.92V126.92C275.646 96.4339 250.932 71.72 220.446 71.72L132.546 71.72C117.911 71.72 106.046 83.5845 106.046 98.22V99.055C106.046 113.229 117.537 124.72 131.711 124.72C145.885 124.72 157.376 113.229 157.376 99.0551V61.92C157.376 31.4339 132.662 6.71997 102.176 6.71997H-510"
              />
              <AnimatedLine
                className={clsx(s.line, s.line4)}
                viewBox="0 0 604 211"
                stroke="url(#hero_line_4)"
                d="M6.48047 77.28V93.28C6.48047 123.766 31.1944 148.48 61.6805 148.48H246.481C276.967 148.48 301.68 123.766 301.68 93.28V34.18C301.68 18.8817 289.279 6.47998 273.98 6.47998C258.682 6.47998 246.28 18.8817 246.28 34.18V35.08C246.28 50.8753 259.085 63.68 274.88 63.68H377.77C408.256 63.68 432.97 88.3939 432.97 118.88V148.48C432.97 178.966 457.684 203.68 488.17 203.68H1091.59"
              />
            </span>
          </RevealText>
          <div ref={cardsRef} data-cards className={s.cards}>
            <HeroCard
              className={s.c1}
              name="Gwen"
              description="Testing & Dev Ops"
              model="Claude Opus"
              color="var(--color-4)"
              icon="hugeicons:server-stack-03"
            />
            <HeroCard
              className={s.c4}
              name="Fiora"
              description="Developer Fullstack"
              model="Claude Sonnet"
              color="var(--color-1)"
              icon="hugeicons:developer"
            />
            <HeroCard
              className={s.c2}
              name="Amara"
              description="CEO & Project Management"
              model="GPT-4.1"
              color="var(--color-3)"
              icon="hugeicons:manager"
            />
            <HeroCard
              className={s.c3}
              name="Ryan"
              description="UX & UI Designer"
              model="Gemini 2.5 Pro"
              color="var(--color-2)"
              icon="hugeicons:paint-bucket"
            />
          </div>
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
