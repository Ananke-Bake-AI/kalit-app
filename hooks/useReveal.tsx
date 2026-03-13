"use client"

import { useGSAP } from "@gsap/react"
import { gsap } from "gsap"
import { ScrollTrigger } from "gsap/all"

export const useReveal = () => {
  useGSAP(() => {
    ScrollTrigger.batch("[data-reveal]", {
      onEnter: (reveal) => {
        gsap.to(reveal, {
          autoAlpha: 1,
          y: 0,
          x: 0,
          stagger: 0.15,
          duration: 1,
          ease: "power2.out"
        })
      },
      start: "top bottom"
    })
  })
}
