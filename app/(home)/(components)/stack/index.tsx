"use client"

import { Container } from "@/components/container"
import { Heading } from "@/components/heading"
import { Illustration } from "@/components/illustration"
import { Paragraph } from "@/components/paragraph"
import { Sprite } from "@/components/sprite"
import { SUITES } from "@/lib/suites"
import { Icon } from "@iconify/react"
import Link from "next/link"
import { useCallback, useRef } from "react"
import "swiper/css"
import "swiper/css/navigation"
import { Navigation } from "swiper/modules"
import { Swiper, SwiperRef, SwiperSlide } from "swiper/react"
import s from "./stack.module.scss"

export const Stack = () => {
  const sliderRef = useRef<SwiperRef>(null)

  const handlePrev = useCallback(() => {
    if (!sliderRef.current) return
    sliderRef.current.swiper.slidePrev()
  }, [])

  const handleNext = useCallback(() => {
    if (!sliderRef.current) return
    sliderRef.current.swiper.slideNext()
  }, [])

  return (
    <section id="stack" className={s.stack}>
      <Container>
        <div className={s.top}>
          <Heading className={s.heading} subtitle="Kalit Execution Stack">
            <span>
              Full{" "}
              <span data-icon="right">
                Stack{" "}
                <span data-icon-svg>
                  <Icon icon="hugeicons:layers-01" />
                </span>
              </span>{" "}
              <br /> Model Matrix
            </span>
          </Heading>
          <div className={s.right}>
            <Paragraph>
              <p>
                Covering four major areas — apps, websites, growth, and security. Everything you need to build and scale
                a digital product end to end.
              </p>
            </Paragraph>
            <div className={s.nav}>
              <button onClick={handlePrev} aria-label="Previous">
                <Icon icon="hugeicons:arrow-left-02" />
              </button>
              <button onClick={handleNext} aria-label="Next">
                <Icon icon="hugeicons:arrow-right-02" />
              </button>
            </div>
          </div>
        </div>
        <Swiper
          ref={sliderRef}
          className={s.slider}
          modules={[Navigation]}
          slidesPerView={1}
          spaceBetween={16}
          speed={500}
          breakpoints={{
            530: {
              slidesPerView: 1,
              spaceBetween: 24
            },
            950: {
              slidesPerView: 2,
              slidesPerGroup: 2,
              speed: 1000,
              spaceBetween: 24
            }
          }}
        >
          {SUITES.map(({ id, color, title, description }) => (
            <SwiperSlide key={id} className={s.slide}>
              <div id={id} className={s.item} style={{ "--color": color } as React.CSSProperties}>
                <div className={s.middle}>
                  <Illustration suite={id} />
                </div>
                <div className={s.bottom}>
                  <h3 data-reveal>
                    <span>kalit</span> <strong>{title}</strong>
                  </h3>
                  <Paragraph className={s.paragraph}>
                    <p>{description}</p>
                  </Paragraph>
                  <Link href="/stack" className={s.link} aria-label={title.charAt(0).toUpperCase() + title.slice(1)}>
                    <Sprite id="arrow-top-right" viewBox="0 0 20 20" />
                  </Link>
                </div>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </Container>
    </section>
  )
}
