"use client"

import { Button } from "@/components/button"
import { Color4Bg } from "@/components/color4bg"
import { Container } from "@/components/container"
import { Heading } from "@/components/heading"
import { Link } from "@/components/link"
import { Logo } from "@/components/logo"
import { SUITES } from "@/lib/suites"
import { useTranslation } from "@/stores/i18n"
import { useGSAP } from "@gsap/react"
import clsx from "clsx"
import gsap from "gsap"
import { useRef } from "react"
import s from "./join.module.scss"

export const Join = () => {
  const t = useTranslation()
  const listRef = useRef<HTMLDivElement>(null)
  const path1Ref = useRef<SVGPathElement>(null)
  const path2Ref = useRef<SVGPathElement>(null)

  useGSAP(() => {
    gsap
      .timeline({
        scrollTrigger: {
          trigger: listRef.current,
          start: "top bottom",
          once: true
        }
      })
      .fromTo(
        [path1Ref.current, path2Ref.current],
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
    <section className={s.join}>
      <Container>
        <Heading
          className={s.heading}
          subtitle={t("join.subtitle")}
          paragraph={t("join.description")}
        >
          {t("join.title")}
        </Heading>
        <div className={s.bottom}>
          <div className={s.screen}>
            <div className={s.screenInside}></div>
          </div>
          <svg className={clsx(s.line, s.line1)} viewBox="0 0 850 215">
            <path
              ref={path1Ref}
              pathLength={1}
              d="M850 208.5H730C699.624 208.5 675 183.876 675 153.5V28.5C675 16.3497 684.85 6.5 697 6.5H697.5C709.374 6.5 719 16.1259 719 28C719 39.8741 709.374 49.5 697.5 49.5H0"
              stroke="url(#join_line_1)"
            />
          </svg>
          <svg className={clsx(s.line, s.line2)} viewBox="0 0 844 338">
            <path
              ref={path2Ref}
              pathLength={1}
              d="M0 291.5H247C258.046 291.5 267 300.454 267 311.5C267 322.546 258.046 331.5 247 331.5C235.954 331.5 227 322.546 227 311.5V61.5C227 31.1243 251.624 6.5 282 6.5H843.831"
              stroke="url(#join_line_2)"
            />
          </svg>
          <div ref={listRef} className={s.list}>
            {SUITES.map((suite) => (
              <div className={s.item} key={suite.id} style={{ "--color": suite.color } as React.CSSProperties}>
                <div className={s.top}>
                  <Link href={`/${suite.id}`} className={s.icon}>
                    <Logo id={suite.id} />
                  </Link>
                  <div className={s.name}>
                    <span>kalit</span> <strong>{suite.title}</strong>
                  </div>
                </div>
                <Button
                  href={`/register?suite=${suite.id}`}
                  className={s.btn}
                  data-button-id={suite.id}
                  variant="tertiary"
                >
                  {t(`suites.${suite.id}Btn`)}
                </Button>
              </div>
            ))}
          </div>
          <div className={s.bg}>
            <Color4Bg className={s.gradient} style="blur-gradient" />
          </div>
        </div>
      </Container>
    </section>
  )
}
