"use client"

import { Container } from "@/components/container"
import { Heading } from "@/components/heading"
import { Icon } from "@/components/icon"
import { Logo } from "@/components/logo"
import { Underline } from "@/components/underline"
import { useAnimatedPlaceholder } from "@/hooks/use-animated-placeholder"
import { useGSAP } from "@gsap/react"
import clsx from "clsx"
import gsap from "gsap"
import { useRef } from "react"
import s from "./try.module.scss"

const PLACEHOLDERS = [
  "Build me an iOS/Android app with recording, effects, and social sharing",
  "Design a SaaS dashboard with billing, team management, and analytics",
  "Create a landing page for my AI product with pricing tiers and FAQ",
  "Generate a web app where users can upload videos and apply filters"
]

export const Try = () => {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const line1PathRef = useRef<SVGPathElement | null>(null)
  const line2PathRef = useRef<SVGPathElement | null>(null)

  const { timelineRef, handleFocus, handleBlur } = useAnimatedPlaceholder(textareaRef, {
    phrases: PLACEHOLDERS,
    focusedPlaceholder: "Write your project..."
  })

  useGSAP(() => {
    gsap.fromTo(
      line1PathRef.current,
      { "--dash-offset": 2 },
      {
        "--dash-offset": 0,
        duration: 4,
        ease: "power1.inOut",
        delay: 0.4,
        scrollTrigger: {
          trigger: line1PathRef.current,
          start: "top bottom",
          once: true
        }
      }
    )
    gsap.fromTo(
      line2PathRef.current,
      { "--dash-offset": 2 },
      {
        "--dash-offset": 0,
        duration: 4,
        ease: "power1.inOut",
        delay: 0.4,
        scrollTrigger: {
          trigger: line2PathRef.current,
          start: "top bottom",
          once: true
        }
      }
    )
  }, [])

  const handlePresetClick = (value: string) => {
    if (!textareaRef.current) return
    if (timelineRef.current) {
      timelineRef.current.pause()
    }
    textareaRef.current.value = value
    textareaRef.current.placeholder = "Write your project..."
    textareaRef.current.focus()
  }

  const buttons = [
    {
      text: "Landing",
      icon: "hugeicons:rocket-01",
      value: "Create a product landing page with pricing tiers and FAQ"
    },
    {
      text: "SaaS",
      icon: "hugeicons:test-tube-01",
      value: "Create a SaaS dashboard with billing, team management, and analytics"
    },
    {
      text: "Portfolio",
      icon: "hugeicons:user-story",
      value: "Create a portfolio website with my projects and skills"
    },
    {
      text: "Restaurant",
      icon: "hugeicons:serving-food",
      value: "Create a restaurant website with menu, reservations, and contact form"
    },
    {
      text: "Game",
      icon: "hugeicons:game-controller-01",
      value: "Create a game website with game mechanics, characters, and levels"
    }
  ]

  return (
    <section className={s.try}>
      <Container className={s.container}>
        <Heading
          className={s.heading}
          subtitle="Try Kalit Flow"
          paragraph="Describe your site. Kalit builds the page, the copy, and the structure — ready to publish in minutes."
        >
          Describe your vision, <br />
          <Underline>Kalit builds it</Underline>
        </Heading>
        <div className={s.form}>
          <div className={s.textarea}>
            <Icon icon="hugeicons:mic-02" className={s.icon} />
            <textarea ref={textareaRef} placeholder="Ask Kalit anything..." onFocus={handleFocus} onBlur={handleBlur} />
            <div className={s.bottom}>
              <button className={s.b1}>
                <Icon icon="hugeicons:cloud-download" />
              </button>
              <button className={s.b2}>
                <span>Fastest</span>
              </button>
              <button className={s.b2}>
                <Icon icon="hugeicons:settings-02" />
              </button>
              <button className={s.b3}>
                <Logo id="kalit" />
              </button>
            </div>
            <svg viewBox="0 0 342 241" className={clsx(s.line, s.line1)}>
              <path
                ref={line1PathRef}
                pathLength={1}
                d="M335.5 240.511V184.511C335.5 162.42 317.591 144.511 295.5 144.511H46.5C24.4086 144.511 6.5 126.603 6.5 104.511V-2.48877"
                stroke="url(#try_line)"
              />
            </svg>
            <svg viewBox="0 0 202 105" className={clsx(s.line, s.line2)}>
              <path
                ref={line2PathRef}
                pathLength={1}
                d="M0 51.5H55.5H88.5C100.926 51.5 111 41.4264 111 29V28.5C111 16.3497 101.15 6.5 89 6.5C76.8497 6.5 67 16.3497 67 28.5V58.5C67 80.5914 84.9086 98.5 107 98.5H332.691"
                stroke="url(#try_line)"
              />
            </svg>
          </div>
          <div className={s.list}>
            {buttons.map((button) => (
              <button key={button.text} type="button" onClick={() => handlePresetClick(button.value)}>
                <Icon icon={button.icon} />
                {button.text}
              </button>
            ))}
          </div>
          <div className={s.bg} aria-hidden />
        </div>
      </Container>
    </section>
  )
}
