"use client"

import { Container } from "@/components/container"
import { Heading } from "@/components/heading"
import { Logo } from "@/components/logo"
import { Models } from "@/components/models"
import { Line } from "@/components/svg/line"
import { useGSAP } from "@gsap/react"
import { Icon } from "@iconify/react"
import clsx from "clsx"
import gsap from "gsap"
import { useRef } from "react"
import s from "./architecture.module.scss"

export const Architecture = () => {
  const path1Ref = useRef<SVGPathElement>(null)

  useGSAP(() => {
    gsap
      .timeline({
        scrollTrigger: {
          trigger: path1Ref.current,
          start: "top bottom"
        }
      })
      .fromTo(
        [path1Ref.current],
        { "--dash-offset": 2 },
        {
          "--dash-offset": 0,
          ease: "power1.inOut",
          duration: 4,
          delay: 0.4
        },
        "a"
      )
  }, [])

  return (
    <section className={s.architecture}>
      <Container>
        <Heading
          className={s.heading}
          subtitle="The Architecture"
          paragraph="It is execution layer that turns AI Intelligence into structured, persistent systems."
        >
          Kalit is not <br />
          <strong className={s.strong}>
            a model
            <Line viewBox="0 0 621 429" className={clsx(s.line, s.line1)}>
              <path
                ref={path1Ref}
                pathLength={1}
                d="M6.75 238.75C6.75 219.42 22.42 203.75 41.75 203.75H258.75C285.812 203.75 307.75 225.688 307.75 252.75V277.25C307.75 290.781 296.781 301.75 283.25 301.75H280.25C268.376 301.75 258.75 292.124 258.75 280.25C258.75 268.376 268.376 258.75 280.25 258.75H567.75H815.75C846.126 258.75 870.75 234.126 870.75 203.75V157.75C870.75 127.374 895.374 102.75 925.75 102.75H968.75C982.005 102.75 992.75 113.495 992.75 126.75C992.75 140.005 982.005 150.75 968.75 150.75H964.75C949.286 150.75 936.75 138.214 936.75 122.75V61.75C936.75 31.3743 961.374 6.75 991.75 6.75H1162.74"
                stroke="url(#architecture_line_1)"
              />
            </Line>
          </strong>
        </Heading>
        <div className={s.layers}>
          <div className={clsx(s.layer, s.layer1)}>
            <h3>AI models</h3>
            <Models className={s.list} />
          </div>
          <svg viewBox="0 0 261 62" className={s.layer1Line}>
            <path d="M106.75 0.500244C114.494 2.76534 129.892 17.7487 130.244 59.528M130.244 59.528C130.248 59.9691 130.25 60.4133 130.25 60.8604M130.244 59.528C130.346 60.1867 130.431 60.8281 130.5 61.4504M130.244 59.528C130.24 59.5047 130.237 59.4814 130.233 59.4582M130.25 60.8604C130.25 60.9043 130.25 60.9482 130.25 60.9922M130.25 60.8604C130.248 60.3898 130.242 59.9224 130.233 59.4582M130.25 60.8604C130.25 60.9805 130.251 61.1009 130.251 61.2214M130.25 61.4504C128.083 41.1337 99.1 0.500244 0.5 0.500244M130.233 59.4582C126.969 38.5973 106.791 0.500244 48.5 0.500244M130.233 59.4582C129.456 20.9315 103.273 4.11179 88.25 0.500244M122.5 0.532227C125.167 5.95511 130.5 25.5081 130.5 60.3367M153.995 0.500244C146.251 2.76534 130.853 17.7487 130.501 59.528M130.501 59.528C130.497 59.9691 130.495 60.4133 130.495 60.8604M130.501 59.528C130.399 60.1867 130.314 60.8281 130.245 61.4504M130.501 59.528C130.504 59.5047 130.508 59.4814 130.512 59.4582M130.495 60.8604C130.495 60.9043 130.495 60.9482 130.495 60.9922M130.495 60.8604C130.497 60.3898 130.502 59.9224 130.512 59.4582M130.495 60.8604C130.494 60.9805 130.494 61.1009 130.494 61.2214M130.495 61.4504C132.661 41.1337 161.645 0.500244 260.245 0.500244M130.512 59.4582C133.776 38.5973 153.954 0.500244 212.245 0.500244M130.512 59.4582C131.289 20.9315 157.472 4.11179 172.495 0.500244M138.245 0.532227C135.578 5.95511 130.245 25.5081 130.245 60.3367" />
          </svg>
          <div className={clsx(s.layer, s.layer2)}>
            <div className={s.logo}>
              <Logo id="kalit" />
            </div>
            <h3>Kalit Execution Layer</h3>
          </div>
          <svg viewBox="0 0 13 67" className={s.layer2Line}>
            <line x1="0.5" y1="0" x2="0.500003" y2="66" stroke="var(--color-1)" />
            <line x1="4.5" y1="0" x2="4.5" y2="66" stroke="var(--color-2)" />
            <line x1="8.5" y1="0" x2="8.5" y2="66" stroke="var(--color-3)" />
            <line x1="12.5" y1="0" x2="12.5" y2="66" stroke="var(--color-4)" />
          </svg>
          <div className={clsx(s.layer, s.layer3)}>
            <div className={s.icon}>
              <Icon icon="svg-spinners:pulse-rings-3" />
            </div>
            <h3>Running Systems</h3>
          </div>
        </div>
      </Container>
    </section>
  )
}
