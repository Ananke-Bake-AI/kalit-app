import { AnimatedLine } from "@/components/svg/animated-line"
import clsx from "clsx"
import { HeroCard } from "./card"
import s from "./hero.module.scss"

interface LinesProps {
  gradient?: "hero-line" | "color-1" | "color-2" | "color-3" | "color-4"
  cards?: boolean
}

export const Lines = ({ gradient = "hero-line", cards = false }: LinesProps) => {
  return (
    <div className={s.lines}>
      <AnimatedLine
        className={clsx(s.line, s.line1)}
        viewBox="0 0 530 357"
        stroke={`url(#${gradient}_1)`}
        d="M 529.607 350.5 H 397.607 C 375.516 350.5 357.607 332.591 357.607 310.5 V 276.5 C 357.607 254.409 339.699 236.5 317.607 236.5 H 193.107 C 180.681 236.5 170.607 246.574 170.607 259 V 260 C 170.607 271.874 180.233 281.5 192.107 281.5 C 203.982 281.5 213.607 271.874 213.607 260 V 46.5 C 213.607 24.4086 195.699 6.5 173.607 6.5 H -327.393"
      />
      <AnimatedLine
        className={clsx(s.line, s.line2)}
        viewBox="0 0 537 373"
        stroke={`url(#${gradient}_2)`}
        d="M 0 366.5 H 225 C 247.091 366.5 265 348.591 265 326.5 V 287.049 C 265 274.132 275.829 263.751 288.742 264.05 C 301.023 264.335 311.018 274.377 311.018 286.662 C 311.018 299.264 300.716 309.435 288.114 309.273 L 267.486 309.007 C 245.597 308.726 228 290.902 228 269.011 V 185.5 C 228 163.409 245.909 145.5 268 145.5 H 355 C 377.091 145.5 395 127.591 395 105.5 V 46.5 C 395 24.4086 412.909 6.5 435 6.5 H 803"
      />
      {cards && (
        <div data-cards className={s.cards}>
          <HeroCard
            className={s.c1}
            name="Gwen"
            description="Testing & Dev Ops"
            model="Claude Opus"
            color="var(--color-4)"
            icon="hugeicons:server-stack-03"
          />
          <HeroCard
            className={s.c4}
            name="Fiora"
            description="Developer Fullstack"
            model="Claude Sonnet"
            color="var(--color-1)"
            icon="hugeicons:developer"
          />
          <HeroCard
            className={s.c2}
            name="Amara"
            description="CEO & Project Management"
            model="GPT-4.1"
            color="var(--color-3)"
            icon="hugeicons:manager"
          />
          <HeroCard
            className={s.c3}
            name="Ryan"
            description="UX & UI Designer"
            model="Gemini 2.5 Pro"
            color="var(--color-2)"
            icon="hugeicons:paint-bucket"
          />
        </div>
      )}
    </div>
  )
}
