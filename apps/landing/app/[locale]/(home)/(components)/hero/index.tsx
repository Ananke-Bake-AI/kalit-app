"use client"

import { Button } from "@/components/button"
import { Color4Bg } from "@/components/color4bg"
import { Container } from "@/components/container"
import { Marquee } from "@/components/marquee"
import { RevealText } from "@/components/reveal-text"
import { Subtitle } from "@/components/subtitle"
import { useI18n } from "@/stores/i18n"
import { useGSAP } from "@gsap/react"
import clsx from "clsx"
import gsap from "gsap"
import { useSession } from "next-auth/react"
import { useRef } from "react"
import s from "./hero.module.scss"
import { Lines } from "./lines"

// User-facing model catalog, mirroring the broker's tier gating
// (kalit-broker internal/models/catalog.go). Names are not translated.
type ModelTier = "free" | "starter" | "pro" | "enterprise"
const MODELS: { name: string; tier: ModelTier }[] = [
  { name: "DeepSeek V4", tier: "free" },
  { name: "Kimi K2.7", tier: "starter" },
  { name: "Qwen3-Coder", tier: "starter" },
  { name: "GLM-5", tier: "starter" },
  { name: "MiniMax M3", tier: "starter" },
  { name: "GPT-OSS 120B", tier: "starter" },
  { name: "Claude Sonnet 4.6", tier: "pro" },
  { name: "Claude Opus 4.8", tier: "pro" },
  { name: "Claude Fable 5", tier: "enterprise" }
]

// The Marquee loops by translating -50% of its content: the single set must be
// wider than any viewport, so render the catalog twice inside one set.
const MARQUEE_MODELS = [...MODELS, ...MODELS]

export const Hero = () => {
  const { status } = useSession()
  const { locale, t } = useI18n()
  const titleRef = useRef<HTMLDivElement>(null)
  const hasAnimatedRef = useRef(false)

  useGSAP(() => {
    const el = titleRef.current
    if (!el) return

    // The title paints from SSR/CSS (no longer visibility:hidden) so it stays
    // the LCP element instead of waiting on this hook — under throttled CPU
    // that wait was pushing LCP to ~10s. GSAP only enhances from here.
    if (!hasAnimatedRef.current) {
      hasAnimatedRef.current = true
      gsap.timeline().fromTo(el, { scale: 1.15 }, { scale: 1, duration: 2, ease: "back.inOut" })
    }
  }, [locale])

  // Everyone lands straight in Studio (Kimi-style funnel): anonymous
  // visitors get the sign-in modal there only when they try to build.
  const primaryHref = "/studio"

  return (
    <section className={s.hero}>
      <div className={s.main}>
        <Container>
          <Subtitle>{t("hero.subtitle")}</Subtitle>
          <div ref={titleRef} className={s.title}>
            <RevealText tag="h1" key={`reveal-${locale}`}>
              <span>{t("hero.title1")}</span>
              <span>{t("hero.title2")}</span>
            </RevealText>
          </div>
          <div className={s.center} data-reveal>
            <Lines />
            <div className={s.panel}>
              <p className={s.lead}>{t("hero.lead")}</p>
              <div className={s.actions}>
                <Button href={primaryHref} circle className={s.btn} data-button-id="hero-studio">
                  {status === "authenticated" ? t("hero.ctaPrimaryAuthed") : t("hero.ctaPrimary")}
                </Button>
                <Button href="#projects" variant="secondary" className={s.btn} data-button-id="hero-projects">
                  {t("hero.ctaSecondary")}
                </Button>
              </div>
            </div>
            <div className={s.aura} aria-hidden>
              <Color4Bg style="blur-gradient" />
            </div>
          </div>
        </Container>
      </div>
      <div className={s.bottom}>
        <div className={s.powered} data-reveal>
          <h2>{t("hero.poweredBy")}</h2>
        </div>
        <div className={s.models} data-reveal>
          <Marquee factor={4}>
            {MARQUEE_MODELS.map((model, i) => (
              <span key={`${model.name}-${i}`} className={clsx(s.model, s[model.tier])}>
                <i aria-hidden />
                {model.name}
                <em>{t(`hero.tier.${model.tier}`)}</em>
              </span>
            ))}
          </Marquee>
        </div>
      </div>
    </section>
  )
}
