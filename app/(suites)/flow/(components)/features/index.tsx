"use client"

import { Button } from "@/components/button"
import { Container } from "@/components/container"
import { Heading } from "@/components/heading"
import { useGSAP } from "@gsap/react"
import gsap from "gsap"
import Image from "next/image"
import { useRef } from "react"
import s from "./features.module.scss"

const CARDS = [
  {
    img: "/img/kalit-flow-feature-1.png",
    title: "Prompt-Based Creation",
    text: "Describe your project in plain language. Our AI generates a complete, working web project instantly."
  },
  {
    img: "/img/kalit-flow-feature-2.png",
    title: "Live Preview",
    text: "See your project come to life in real-time with an interactive preview right in your browser."
  },
  {
    img: "/img/kalit-flow-feature-3.png",
    title: "Download & Deploy",
    text: "Export as a ready-to-deploy package. Take full ownership of your code and host it anywhere."
  },
  {
    img: "/img/kalit-flow-feature-4.png",
    title: "API Access",
    text: "Integrate Flow into your workflow. Generate projects programmatically with your API keys."
  }
]

export const Features = () => {
  const cardsRef = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      const root = cardsRef.current
      if (!root) return

      const ctx = gsap.context(() => {
        const items = gsap.utils.toArray<HTMLElement>(root.children)
        for (let i = 0; i < items.length; i++) {
          if (i !== items.length - 1) {
            gsap.to(items[i], {
              scale: 0.95,
              scrollTrigger: {
                trigger: items[i],
                start: "50% 50%",
                endTrigger: items[i + 1],
                end: "50% 50%",
                scrub: true
              }
            })
          }
          gsap.to(`[data-img="${i}"]`, {
            scale: 1,
            scrollTrigger: {
              trigger: items[i],
              start: "top bottom",
              end: "50% 50%",
              scrub: true
            }
          })
        }
      }, root)

      return () => ctx.revert()
    },
    { scope: cardsRef, dependencies: [CARDS.length] }
  )

  return (
    <section className={s.features}>
      <Container className={s.container}>
        <Heading
          className={s.heading}
          subtitle="Our features"
          paragraph="From idea to deployed project in minutes. No barriers between your vision and a live website."
        >
          Everything you need
          <br />
          to ship faster
        </Heading>
        <div ref={cardsRef} className={s.cards}>
          {CARDS.map((card, i) => (
            <div className={s.card} key={i}>
              <div className={s.left}>
                <h3>{card.title}</h3>
                <p>{card.text}</p>
                <Button circle>Start Building</Button>
              </div>
              <div className={s.right}>
                <Image
                  src={card.img}
                  alt={card.title}
                  width={1314}
                  height={1046}
                  quality={100}
                  draggable={false}
                  data-img={i}
                />
              </div>
            </div>
          ))}
        </div>
      </Container>
    </section>
  )
}
