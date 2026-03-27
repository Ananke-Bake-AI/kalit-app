"use client"

import { useGSAP } from "@gsap/react"
import clsx from "clsx"
import gsap from "gsap"
import { type ReactNode, useRef } from "react"

import { Button } from "@/components/button"
import { Container } from "@/components/container"
import { Heading } from "@/components/heading"
import s from "./portfolio.module.scss"

export interface PortfolioProps {
  subtitle: string
  heading: ReactNode
  paragraph: ReactNode
  buttonText: string
  link: string
  className?: string
}

export function Portfolio({ subtitle, heading, paragraph, buttonText, link, className }: PortfolioProps) {
  const carouselRef = useRef<HTMLDivElement | null>(null)

  useGSAP(
    () => {
      const root = carouselRef.current
      if (!root) return

      const projects = gsap.utils.toArray<HTMLElement>(root.querySelectorAll("[data-project]"))
      const totalProjects = projects.length
      if (!totalProjects) return

      const delayBetweenProjects = 2.5
      const duration = 12

      projects.forEach((project, index) => {
        gsap.fromTo(
          project,
          { rotation: 40 },
          {
            rotation: -40,
            duration,
            ease: "none",
            repeat: -1,
            delay: index * delayBetweenProjects,
            repeatDelay: delayBetweenProjects * totalProjects - duration
          }
        )
      })
    },
    { scope: carouselRef, dependencies: [] }
  )

  return (
    <section className={clsx(s.portfolio, className)}>
      <Container>
        <Heading className={s.heading} subtitle={subtitle} paragraph={paragraph} tag="h2">
          {heading}
        </Heading>
        <div ref={carouselRef} className={s.carousel}>
          {Array.from({ length: 5 }).map((_, index) => (
            <div className={s.project} data-project key={index}>
              <div className={s.screen} />
            </div>
          ))}
        </div>
        <Button className={s.btn} circle href={link}>
          {buttonText}
        </Button>
      </Container>
    </section>
  )
}

Portfolio.displayName = "Portfolio"
