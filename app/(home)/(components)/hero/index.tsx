"use client"

import { Button } from "@/components/button"
import { ButtonGroup } from "@/components/button/group"
import { Container } from "@/components/container"
import { Models } from "@/components/models"
import { Paragraph } from "@/components/paragraph"
import { Subtitle } from "@/components/subtitle"
import { Line } from "@/components/svg/line"
import clsx from "clsx"
import gsap from "gsap"
import { useId, useLayoutEffect, useRef } from "react"
import { HeroCard } from "./card"
import s from "./hero.module.scss"

export const Hero = () => {
  const heroId = useId().replace(/:/g, "")
  const heroLine1Id = `${heroId}-hero-line-1`
  const heroLine2Id = `${heroId}-hero-line-2`
  const heroLine3Id = `${heroId}-hero-line-3`
  const heroLine4Id = `${heroId}-hero-line-4`
  const titleRef = useRef<HTMLDivElement>(null)
  const cardsRef = useRef<HTMLDivElement>(null)
  const word1Ref = useRef<HTMLSpanElement>(null)
  const word2Ref = useRef<HTMLSpanElement>(null)
  const word3Ref = useRef<HTMLSpanElement>(null)
  const word4Ref = useRef<HTMLSpanElement>(null)
  const path1Ref = useRef<SVGPathElement>(null)
  const line1Ref = useRef<SVGLineElement>(null)
  const path2Ref = useRef<SVGPathElement>(null)
  const line2Ref = useRef<SVGLineElement>(null)
  const path3Ref = useRef<SVGPathElement>(null)
  const line3Ref = useRef<SVGLineElement>(null)
  const path4Ref = useRef<SVGPathElement>(null)
  const line4Ref = useRef<SVGLineElement>(null)

  useLayoutEffect(() => {
    const words = [word1Ref.current, word2Ref.current, word3Ref.current, word4Ref.current]
    const animatedPaths = [path1Ref.current, path2Ref.current, path3Ref.current, path4Ref.current]
    const animatedLines = [line1Ref.current, line2Ref.current, line3Ref.current, line4Ref.current]
    const cards = cardsRef.current ? Array.from(cardsRef.current.children) : []

    if (
      !titleRef.current ||
      words.some((item) => !item) ||
      animatedPaths.some((item) => !item) ||
      animatedLines.some((item) => !item)
    ) {
      return
    }

    gsap.set(titleRef.current, { visibility: "hidden", scale: 1.12 })
    gsap.set(words, { yPercent: 110, opacity: 0 })
    gsap.set(animatedPaths, { "--dash-offset": 2 })
    gsap.set(animatedLines, { "--dash-offset": 2 })
    gsap.set(cards, { scale: 0 })

    const timeline = gsap
      .timeline()
      .set(titleRef.current, { visibility: "visible" }, 0.2)
      .to(titleRef.current, { scale: 1, duration: 1.8, ease: "back.inOut" }, "intro")
      .to(
        words,
        {
          yPercent: 0,
          opacity: 1,
          stagger: 0.1,
          duration: 0.9,
          ease: "back.out(1.2)"
        },
        "intro"
      )
      .fromTo(
        animatedPaths,
        { "--dash-offset": 2 },
        {
          "--dash-offset": 0,
          ease: "power1.inOut",
          duration: 4,
          delay: 0.4
        },
        "intro"
      )
      .fromTo(
        animatedLines,
        { "--dash-offset": 2 },
        {
          "--dash-offset": 0,
          ease: "power1.inOut",
          duration: 0.8,
          delay: 2.2
        },
        "intro"
      )
      .fromTo(
        cards,
        { scale: 0 },
        { scale: 1, stagger: 0.25, duration: 1, ease: "back.out", delay: 1.5 },
        "intro"
      )

    return () => {
      timeline.kill()
    }
  }, [])

  return (
    <section className={s.hero}>
      <Container>
        <Subtitle>Early access — Now open</Subtitle>
        <div ref={titleRef} className={s.title}>
          <h1>
            <span>
              <span ref={word1Ref} className={s.word}>
                Build,
              </span>{" "}
              <span ref={word2Ref} className={s.word}>
                Launch
              </span>
              <Line viewBox="0 0 621 429" className={clsx(s.line, s.line1)}>
                <defs>
                  <radialGradient
                    id={heroLine1Id}
                    cx="0"
                    cy="0"
                    r="1"
                    gradientUnits="userSpaceOnUse"
                    gradientTransform="translate(615.873 112.067) rotate(158.849) scale(586.974 679.116)"
                  >
                    <stop offset="0" stopColor="var(--text)" />
                    <stop offset="0.15" stopColor="var(--color-1)" />
                    <stop offset="0.3" stopColor="var(--color-1)" />
                    <stop offset="0.5" stopColor="var(--color-2)" />
                    <stop offset="0.75" stopColor="var(--color-3)" />
                    <stop offset="1" stopColor="var(--color-4)" />
                  </radialGradient>
                </defs>
                <path
                  ref={path1Ref}
                  pathLength={1}
                  d="M614.025 111.307V61.694c0-30.481-24.706-55.193-55.187-55.2l-56.152-.014c-30.491-.007-55.213 24.709-55.213 55.2v73.986c0 13.034 10.566 23.6 23.6 23.6s23.6-10.764 23.6-23.798c0-13.255-10.746-24.202-24-24.202h-24.8c-26.952 0-48.8 21.849-48.8 48.8v207c-.001 30.486-24.714 55.2-55.2 55.2H191.472c-30.486 0-55.2-24.714-55.2-55.2v-7c0-30.486-24.713-55.2-55.2-55.2h-90.63"
                  stroke={`url(#${heroLine1Id})`}
                />
                <line ref={line1Ref} pathLength={1} x1="-95" x2="-300" y1="51.4" y2="51.4" stroke="var(--color-4)" />
              </Line>
              <Line viewBox="0 0 557 173" className={clsx(s.line, s.line2)}>
                <defs>
                  <radialGradient
                    id={heroLine2Id}
                    cx="0"
                    cy="0"
                    r="1"
                    gradientUnits="userSpaceOnUse"
                    gradientTransform="matrix(567.49 -108 -212.587 437.783 6.4803 108.88)"
                  >
                    <stop offset="0" stopColor="var(--text)" />
                    <stop offset="0.25" stopColor="var(--color-4)" />
                    <stop offset="0.5" stopColor="var(--color-3)" />
                    <stop offset="0.75" stopColor="var(--color-2)" />
                    <stop offset="1" stopColor="var(--color-1)" />
                  </radialGradient>
                </defs>
                <path
                  ref={path2Ref}
                  pathLength={1}
                  d="M6.48047 111.28L6.48047 61.6801C6.48047 31.1939 31.1943 6.48001 61.6805 6.48001H128.68C152.76 6.48001 172.28 26.0004 172.28 50.08C172.28 74.1596 191.801 93.6799 215.88 93.6799H369.98C384.837 93.6799 396.88 81.4121 396.88 66.5556C396.88 51.9448 385.036 39.8798 370.425 39.8798C355.815 39.8798 343.97 51.7242 343.97 66.335V110.68C343.97 141.166 368.684 165.88 399.17 165.88H616.97"
                  stroke={`url(#${heroLine2Id})`}
                />
                <line ref={line2Ref} pathLength={1} x1="616" x2="800" y1="166" y2="166" stroke="var(--color-1)" />
              </Line>
            </span>
            <span>
              <span ref={word3Ref} className={s.word}>
                Grow,
              </span>{" "}
              <span ref={word4Ref} className={s.word}>
                Secure
              </span>
              <Line viewBox="0 0 557 253" className={clsx(s.line, s.line3)}>
                <defs>
                  <radialGradient
                    id={heroLine3Id}
                    cx="0"
                    cy="0"
                    r="1"
                    gradientUnits="userSpaceOnUse"
                    gradientTransform="matrix(-473.27 -152 323.364 -304.629 549.713 180.72)"
                  >
                    <stop offset="0" stopColor="var(--text)" />
                    <stop offset="0.25" stopColor="var(--color-2)" />
                    <stop offset="0.5" stopColor="var(--color-1)" />
                    <stop offset="0.75" stopColor="var(--color-3)" />
                    <stop offset="1" stopColor="var(--color-4)" />
                  </radialGradient>
                </defs>
                <path
                  ref={path3Ref}
                  pathLength={1}
                  d="M549.713 177.32V190.92C549.713 221.406 524.999 246.12 494.513 246.12L336.913 246.12C306.426 246.12 281.713 221.406 281.713 190.92V126.92C281.713 96.4339 256.999 71.72 226.513 71.72L138.612 71.72C123.977 71.72 112.113 83.5845 112.113 98.22V99.055C112.113 113.229 123.603 124.72 137.777 124.72C151.952 124.72 163.442 113.229 163.442 99.0551V61.92C163.442 31.4339 138.728 6.71997 108.242 6.71997H-8.55762"
                  stroke={`url(#${heroLine3Id})`}
                />
                <line ref={line3Ref} pathLength={1} x1="69" x2="-200" y1="226.5" y2="226.5" stroke="var(--color-4)" />
              </Line>
              <Line viewBox="0 0 604 211" className={clsx(s.line, s.line4)}>
                <defs>
                  <radialGradient
                    id={heroLine4Id}
                    cx="0"
                    cy="0"
                    r="1"
                    gradientUnits="userSpaceOnUse"
                    gradientTransform="matrix(600.49 138 -402.225 314.22 6.48025 72.6799)"
                  >
                    <stop offset="0" stopColor="var(--text)" />
                    <stop offset="0.25" stopColor="var(--color-3)" />
                    <stop offset="0.5" stopColor="var(--color-2)" />
                    <stop offset="0.75" stopColor="var(--color-1)" />
                    <stop offset="1" stopColor="var(--color-4)" />
                  </radialGradient>
                </defs>
                <path
                  ref={path4Ref}
                  pathLength={1}
                  d="M6.48047 77.28V93.28C6.48047 123.766 31.1944 148.48 61.6805 148.48H246.481C276.967 148.48 301.68 123.766 301.68 93.28V34.18C301.68 18.8817 289.279 6.47998 273.98 6.47998C258.682 6.47998 246.28 18.8817 246.28 34.18V35.08C246.28 50.8753 259.085 63.68 274.88 63.68H377.77C408.256 63.68 432.97 88.3939 432.97 118.88V148.48C432.97 178.966 457.684 203.68 488.17 203.68H720.97"
                  stroke={`url(#${heroLine4Id})`}
                />
                <line ref={line4Ref} pathLength={1} x1="721" x2="900" y1="203.6" y2="203.6" stroke="var(--color-4)" />
              </Line>
            </span>
          </h1>
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
        <Paragraph className={s.paragraph}>
          <p>
            Four AI suites to build your app, launch your site, acquire users, and secure your product. One platform,
            zero overhead.
          </p>
        </Paragraph>
        <ButtonGroup direction="column" data-reveal>
          <Button className={s.btn} circle href="/register">
            Choose your suite
          </Button>
          <Button variant="secondary" href="#stack">See how it works</Button>
        </ButtonGroup>
        <div className={s.ai} data-reveal>
          <h2>Powered by leading AI models, orchestrated by Kalit</h2>
          <Models />
        </div>
      </Container>
    </section>
  )
}
