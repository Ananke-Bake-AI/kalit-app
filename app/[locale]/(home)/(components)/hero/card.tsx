import { Icon } from "@/components/icon"
import clsx from "clsx"
import { forwardRef } from "react"
import s from "./hero.module.scss"

interface HeroCardProps {
  className: string
  name: string
  description: string
  model: string
  color: string
  icon: string
}

export const HeroCard = forwardRef<HTMLDivElement, HeroCardProps>(
  ({ className, name, description, model, color, icon }, ref) => {
    return (
      <div ref={ref} className={clsx(s.card, className)} style={{ "--color": color } as React.CSSProperties}>
        <div className={s.inside}>
          <div className={s.icon}>
            <Icon icon={icon} />
          </div>
          <div className={s.right}>
            <span className={s.model}>{model}</span>
            <div className={s.name}>{name}</div>
            <div className={s.description}>{description}</div>
          </div>
        </div>
      </div>
    )
  }
)

HeroCard.displayName = "HeroCard"
