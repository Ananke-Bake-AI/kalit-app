import { getSuiteById, SUITES, type SuiteId } from "@/lib/suites"
import clsx from "clsx"
import { forwardRef, SVGProps } from "react"
import s from "./logo.module.scss"

type LogoId = "kalit" | SuiteId

interface LogoProps extends SVGProps<SVGSVGElement> {
  className?: string
  all?: boolean
  id?: LogoId
}

const KALIT_LOGO_D =
  "M71.8779 81.977C71.8779 64.9236 58.0534 51.0991 41 51.0991C23.9466 51.0991 10.1221 64.9236 10.1221 81.977V0.0436401M71.8779 0.0646362C71.8779 17.118 58.0534 30.9426 41 30.9426"

const KALIT_LOGO_TITLE = "Kalit — AI Platform"

const ALL_LOGO_TITLE = "Kalit — Product Family"

function resolveLogoTitle(id: LogoId, all: boolean): string {
  if (all) return ALL_LOGO_TITLE
  if (id === "kalit") return KALIT_LOGO_TITLE
  return getSuiteById(id)?.logoTitle ?? KALIT_LOGO_TITLE
}

function resolveLogoPaths(id: LogoId, all: boolean): { id: LogoId; d: string }[] {
  if (all) {
    return [{ id: "kalit", d: KALIT_LOGO_D }, ...SUITES.map((suite) => ({ id: suite.id, d: suite.logoD }))]
  }
  if (id === "kalit") return [{ id: "kalit", d: KALIT_LOGO_D }]
  const suite = getSuiteById(id)
  return suite ? [{ id: suite.id, d: suite.logoD }] : [{ id: "kalit", d: KALIT_LOGO_D }]
}

export const Logo = forwardRef<SVGSVGElement, LogoProps>(({ className, all = false, id = "kalit", ...props }, ref) => {
  const title = resolveLogoTitle(id, all)
  const paths = resolveLogoPaths(id, all)

  return (
    <svg {...props} className={clsx(s.logo, className)} ref={ref} viewBox="0 0 82 82">
      <title>{title}</title>
      {paths.map((path) => (
        <path
          key={path.id}
          data-logo-id={path.id}
          d={path.d}
          pathLength={2}
          style={{ "--color": getSuiteById(path.id as SuiteId)?.color } as React.CSSProperties}
        />
      ))}
    </svg>
  )
})
