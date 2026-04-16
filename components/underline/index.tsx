"use client"

import { useRef } from "react"

interface UnderlineProps {
  children: React.ReactNode
  spriteId?: string
  viewBox?: string
  stroke?: string
}

export const Underline = ({
  children,
  spriteId = "underline",
  viewBox = "0 0 121 19",
  stroke = "url(#underline)"
}: UnderlineProps) => {
  const svgRef = useRef<SVGSVGElement | null>(null)

  // useGSAP(() => {
  //   if (!svgRef.current) return

  //   const target = svgRef.current

  //   const tween = gsap.fromTo(
  //     target,
  //     { "--dash-offset": 2 },
  //     {
  //       "--dash-offset": 0,
  //       duration: 1.5,
  //       ease: "power1.inOut",
  //       paused: true
  //     }
  //   )

  //   const trigger = ScrollTrigger.create({
  //     trigger: target,
  //     start: "top 95%",
  //     once: true,
  //     onEnter: () => {
  //       tween.play(0)
  //     }
  //   })

  //   return () => {
  //     tween.kill()
  //     trigger.kill()
  //   }
  // }, [])

  return (
    <strong data-underline>
      {children}
      {/* <Sprite ref={svgRef} id={spriteId} viewBox={viewBox} stroke={stroke} /> */}
    </strong>
  )
}
