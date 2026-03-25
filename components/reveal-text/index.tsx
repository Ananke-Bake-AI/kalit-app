"use client"

import { easings } from "@/components/layout/gsap/easings"
import { Tag } from "@/types/Tag"
import { useGSAP } from "@gsap/react"
import clsx from "clsx"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { SplitText } from "gsap/SplitText"
import { useRef } from "react"
import s from "./reveal-text.module.scss"

if (typeof window !== "undefined") {
  gsap.registerPlugin(SplitText, ScrollTrigger)
}

interface RevealTextProps extends React.HTMLAttributes<HTMLDivElement> {
  children: string | React.ReactNode
  className?: string
  tag?: Tag
  animate?: boolean
  split?: boolean
  start?: string
  onComplete?: () => void
}

export const RevealText = ({
  children,
  className,
  tag = "div",
  animate = true,
  split = true,
  start = "50% bottom",
  onComplete,
  ...props
}: RevealTextProps) => {
  const Element = tag
  const elementRef = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      if (!elementRef.current || !split) return

      const root = elementRef.current

      const splitText = new SplitText(root, {
        type: "words",
        wordsClass: s.word,
        smartWrap: true,
        ignore: "[data-icon]"
      })

      const iconWrappers = root.querySelectorAll<HTMLElement>("[data-icon-svg]")

      const tl = gsap.timeline({
        defaults: { ease: easings.smoothOut },
        scrollTrigger: {
          trigger: root,
          start,
          once: true
        }
      })

      if (animate) {
        tl.from(splitText.words, {
          yPercent: 110,
          stagger: 0.1,
          duration: 0.9,
          opacity: 0,
          ease: "back.out(1.2)",
          onComplete: () => {
            onComplete?.()
          }
        })

        if (iconWrappers.length > 0) {
          tl.fromTo(
            iconWrappers,
            { scale: 0 },
            {
              scale: 1,
              ease: "back.out(1.2)",
              duration: 1,
              stagger: 0.2,
              delay: 0.5
            },
            "<"
          )
        }
      }

      const syncScrollTriggerAndMaybePlay = () => {
        ScrollTrigger.refresh()
        tl.scrollTrigger?.update()
        if (tl.progress() > 0.001) return
        const r = root.getBoundingClientRect()
        const vh = window.visualViewport?.height ?? window.innerHeight
        if (r.top < vh && r.bottom > 0) tl.play(0)
      }

      let raf2 = 0
      const raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(syncScrollTriggerAndMaybePlay)
      })

      const tLate = window.setTimeout(syncScrollTriggerAndMaybePlay, 200)

      const io = new IntersectionObserver(
        (entries) => {
          if (!entries[0]?.isIntersecting) return
          syncScrollTriggerAndMaybePlay()
        },
        { threshold: 0.01, rootMargin: "0px 0px 10% 0px" }
      )
      io.observe(root)

      return () => {
        cancelAnimationFrame(raf1)
        cancelAnimationFrame(raf2)
        window.clearTimeout(tLate)
        io.disconnect()
        tl.kill()
        splitText.revert()
      }
    },
    { scope: elementRef, dependencies: [animate, split, start, onComplete] }
  )

  return (
    <Element ref={elementRef} className={clsx(s.reveal, className)} {...props}>
      {children}
    </Element>
  )
}
