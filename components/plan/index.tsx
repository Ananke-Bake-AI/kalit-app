import clsx from "clsx"
import type { ReactNode } from "react"
import { Badge } from "../badge"
import { Button } from "../button"
import s from "./plan.module.scss"

export interface PlanProps {
  name: string
  tagline: string
  features: readonly string[]
  recommended?: boolean
  /**
   * Badge à côté du nom quand `recommended` : omis → « Recommended », `null` → pas de badge blanc
   * (ex. pastilles custom via `badges` uniquement).
   */
  titleBadge?: string | null
  price: string
  priceSuffix?: string
  buttonText?: string
  /** Remplace le bouton par défaut (checkout, portal, etc.) */
  action?: ReactNode
  /** Pastilles sur la même ligne que le nom (ex. « Most selected », « Current plan ») */
  badges?: ReactNode
  className?: string
  withReveal?: boolean
}

function resolveTitleBadge(recommended: boolean, titleBadge: string | null | undefined): string | null {
  if (!recommended) return null
  if (titleBadge === null) return null
  if (titleBadge === undefined) return "Recommended"
  return titleBadge
}

export function Plan({
  name,
  tagline,
  features,
  recommended = false,
  titleBadge,
  price,
  priceSuffix,
  buttonText = "Get started",
  action,
  badges,
  className,
  withReveal = true
}: PlanProps) {
  const badgeNextToName = resolveTitleBadge(recommended, titleBadge)

  return (
    <div
      className={clsx(s.plan, recommended && s.recommended, className)}
      {...(withReveal ? { "data-reveal": true } : {})}
    >
      <div className={s.top}>
        <h3 className={s.name}>
          {name}
          {badgeNextToName ? (
            <Badge className={s.badge} variant="white">
              {badgeNextToName}
            </Badge>
          ) : null}
          {badges}
        </h3>
        <div className={s.price}>
          {price}
          {priceSuffix ? <small>{priceSuffix}</small> : null}
        </div>
        <div className={s.desc}>{tagline}</div>
        <div className={s.cta}>
          {action ?? <Button className={s.button}>{buttonText}</Button>}
        </div>
      </div>
      <div className={s.bottom}>
        <h4>What&apos;s included:</h4>
        <ul>
          {features.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}

Plan.displayName = "Plan"
