"use client"

import { Button } from "@/components/button"
import { ButtonGroup } from "@/components/button/group"
import { Container } from "@/components/container"
import { Paragraph } from "@/components/paragraph"
import { RevealText } from "@/components/reveal-text"
import { Sprite } from "@/components/sprite"
import { Subtitle } from "@/components/subtitle"
import { Line } from "@/components/svg/line"
import { useGSAP } from "@gsap/react"
import clsx from "clsx"
import gsap from "gsap"
import { useRef } from "react"
import { HeroCard } from "./card"
import s from "./hero.module.scss"

export const Hero = () => {
  const titleRef = useRef<HTMLDivElement>(null)
  const path1Ref = useRef<SVGPathElement>(null)
  const line1Ref = useRef<SVGLineElement>(null)
  const path2Ref = useRef<SVGPathElement>(null)
  const line2Ref = useRef<SVGLineElement>(null)
  const path3Ref = useRef<SVGPathElement>(null)
  const line3Ref = useRef<SVGLineElement>(null)
  const path4Ref = useRef<SVGPathElement>(null)
  const line4Ref = useRef<SVGLineElement>(null)

  useGSAP(() => {
    gsap
      .timeline()
      .to(titleRef.current, { visibility: "visible", delayAfter: 0.3 })
      .fromTo(titleRef.current, { scale: 1.15 }, { scale: 1, duration: 2, ease: "back.inOut" }, "a")
      .fromTo(
        [path1Ref.current, path2Ref.current, path3Ref.current, path4Ref.current],
        { "--dash-offset": 2 },
        {
          "--dash-offset": 0,
          ease: "power1.inOut",
          duration: 4,
          delay: 0.4
        },
        "a"
      )
      .fromTo(
        [line1Ref.current, line2Ref.current, line3Ref.current, line4Ref.current],
        { "--dash-offset": 2 },
        {
          "--dash-offset": 0,
          ease: "power1.inOut",
          duration: 0.8,
          delay: 2.2
        },
        "a"
      )
      .fromTo(
        "[data-cards] > *",
        { scale: 0 },
        { scale: 1, stagger: 0.25, duration: 1, ease: "back.out", delay: 1.5 },
        "a"
      )
  }, [])

  return (
    <section className={s.hero}>
      <Container>
        <Subtitle>Now in early access — 2026</Subtitle>
        <div ref={titleRef} className={s.title}>
          <RevealText tag="h1">
            <span>
              Build Anything
              <Line viewBox="0 0 621 429" className={clsx(s.line, s.line1)}>
                <path
                  ref={path1Ref}
                  pathLength={1}
                  d="M614.025 111.307V61.694c0-30.481-24.706-55.193-55.187-55.2l-56.152-.014c-30.491-.007-55.213 24.709-55.213 55.2v73.986c0 13.034 10.566 23.6 23.6 23.6s23.6-10.764 23.6-23.798c0-13.255-10.746-24.202-24-24.202h-24.8c-26.952 0-48.8 21.849-48.8 48.8v207c-.001 30.486-24.714 55.2-55.2 55.2H191.472c-30.486 0-55.2-24.714-55.2-55.2v-7c0-30.486-24.713-55.2-55.2-55.2h-90.63"
                  stroke="url(#hero_line_1)"
                />
                <line ref={line1Ref} pathLength={1} x1="-95" x2="-300" y1="70" y2="70" stroke="var(--color-4)" />
              </Line>
              <Line viewBox="0 0 557 173" className={clsx(s.line, s.line2)}>
                <path
                  ref={path2Ref}
                  pathLength={1}
                  d="M6.48047 111.28L6.48047 61.6801C6.48047 31.1939 31.1943 6.48001 61.6805 6.48001H128.68C152.76 6.48001 172.28 26.0004 172.28 50.08C172.28 74.1596 191.801 93.6799 215.88 93.6799H369.98C384.837 93.6799 396.88 81.4121 396.88 66.5556C396.88 51.9448 385.036 39.8798 370.425 39.8798C355.815 39.8798 343.97 51.7242 343.97 66.335V110.68C343.97 141.166 368.684 165.88 399.17 165.88H616.97"
                  stroke="url(#hero_line_2)"
                />
                <line ref={line2Ref} pathLength={1} x1="616" x2="800" y1="166" y2="166" stroke="var(--color-1)" />
              </Line>
            </span>
            <span>
              Run Everything
              <Line viewBox="0 0 557 253" className={clsx(s.line, s.line3)}>
                <path
                  ref={path3Ref}
                  pathLength={1}
                  d="M549.713 177.32V190.92C549.713 221.406 524.999 246.12 494.513 246.12L336.913 246.12C306.426 246.12 281.713 221.406 281.713 190.92V126.92C281.713 96.4339 256.999 71.72 226.513 71.72L138.612 71.72C123.977 71.72 112.113 83.5845 112.113 98.22V99.055C112.113 113.229 123.603 124.72 137.777 124.72C151.952 124.72 163.442 113.229 163.442 99.0551V61.92C163.442 31.4339 138.728 6.71997 108.242 6.71997H-8.55762"
                  stroke="url(#hero_line_3)"
                />
                <line ref={line3Ref} pathLength={1} x1="69" x2="-200" y1="211" y2="211" stroke="var(--color-4)" />
              </Line>
              <Line viewBox="0 0 604 211" className={clsx(s.line, s.line4)}>
                <path
                  ref={path4Ref}
                  pathLength={1}
                  d="M6.48047 77.28V93.28C6.48047 123.766 31.1944 148.48 61.6805 148.48H246.481C276.967 148.48 301.68 123.766 301.68 93.28V34.18C301.68 18.8817 289.279 6.47998 273.98 6.47998C258.682 6.47998 246.28 18.8817 246.28 34.18V35.08C246.28 50.8753 259.085 63.68 274.88 63.68H377.77C408.256 63.68 432.97 88.3939 432.97 118.88V148.48C432.97 178.966 457.684 203.68 488.17 203.68H720.97"
                  stroke="url(#hero_line_4)"
                />
                <line ref={line4Ref} pathLength={1} x1="721" x2="900" y1="203.6" y2="203.6" stroke="var(--color-4)" />
              </Line>
            </span>
          </RevealText>
          <div data-cards className={s.cards}>
            <HeroCard
              className={s.c1}
              name="Gwen"
              description="Testing & Dev Ops"
              model="o1-mini"
              color="var(--color-4)"
              icon="hugeicons:server-stack-03"
            />
            <HeroCard
              className={s.c4}
              name="Fiora"
              description="Developer Fullstack"
              model="Claude-3.5-sonnet"
              color="var(--color-1)"
              icon="hugeicons:developer"
            />
            <HeroCard
              className={s.c2}
              name="Amara"
              description="CEO & Project Management"
              model="ChatGPT-4o-latest"
              color="var(--color-3)"
              icon="hugeicons:manager"
            />
            <HeroCard
              className={s.c3}
              name="Ryan"
              description="UX & UI Designer"
              model="Gemini-2.5-pro"
              color="var(--color-2)"
              icon="hugeicons:paint-bucket"
            />
          </div>
        </div>
        <Paragraph className={s.paragraph}>
          <p>
            Let Kalit build your team using the world’s most advanced AI agent models — and together, launch and scale
            your project from A to Z, across the globe.
          </p>
        </Paragraph>
        <ButtonGroup direction="column">
          <Button className={s.btn} circle>
            Start my project
          </Button>
          <Button secondary>See it in action</Button>
        </ButtonGroup>
        <div className={s.ai}>
          <h2>Powered by the best AI</h2>
          <div className={s.list}>
            <Sprite className={s.openai} id="open-ai" viewBox="0 0 89 23" />
            <Sprite className={s.anthropic} id="anthropic" viewBox="0 0 143 16" />
            <Sprite className={s.google} id="google" viewBox="0 0 88 30" />
          </div>
        </div>
      </Container>
    </section>
  )
}
