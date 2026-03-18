/* eslint-disable react-hooks/rules-of-hooks */
"use client"

import { Button } from "@/components/button"
import { Container } from "@/components/container"
import { Heading } from "@/components/heading"
import { Underline } from "@/components/underline"
import { useGSAP } from "@gsap/react"
import { Icon } from "@iconify/react"
import { gsap } from "gsap"
import { useRef } from "react"
import s from "./portfolio.module.scss"

export const Portfolio = () => {
  const sectionRef = useRef<HTMLElement | null>(null)
  const carouselRef = useRef<HTMLDivElement | null>(null)

  useGSAP(() => {
    if (!carouselRef.current || !sectionRef.current) return

    const projects = gsap.utils.toArray<HTMLElement>("[data-project]")
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
  }, [])

  return (
    <section ref={sectionRef} className={s.portfolio}>
      <Container>
        <Heading
          className={s.heading}
          subtitle="Kalit Portfolio"
          paragraph={
            <>
              Real projects{" "}
              <Underline>built and shipped</Underline>{" "}
              by founders using Kalit.
            </>
          }
        >
          <span data-icon="left">
            Let
            <span data-icon-svg>
              <Icon icon="hugeicons:ai-idea" />
            </span>
          </span>{" "}
          your imagination run wild, <br />
          <span> Kalit</span> will create it
        </Heading>
        <div ref={carouselRef} className={s.carousel}>
          {Array.from({ length: 4 }).map((_, index) => (
            <div className={s.project} data-project key={index}>
              <div className={s.screen} />
            </div>
          ))}
        </div>
        <Button className={s.btn} circle>
          Explore more projects
        </Button>
      </Container>
    </section>
  )
}
