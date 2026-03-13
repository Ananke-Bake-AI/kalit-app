import clsx from "clsx"
import { forwardRef } from "react"
import s from "./logo.module.scss"

type LogoId = "kalit" | "pentest" | "flow" | "marketing" | "project"

interface LogoProps {
  className?: string
  all?: boolean
  id?: LogoId
}

const LOGO_TITLES: Record<LogoId, string> = {
  kalit: "Kalit — AI Platform",
  pentest: "Kalit — Pentest Suite",
  flow: "Kalit — Flow Orchestration",
  marketing: "Kalit — Marketing Suite",
  project: "Kalit — Project Workspace"
}

const LOGO_PATHS: { id: LogoId; d: string }[] = [
  {
    id: "kalit",
    d: "M71.8779 81.977C71.8779 64.9236 58.0534 51.0991 41 51.0991C23.9466 51.0991 10.1221 64.9236 10.1221 81.977V0.0436401M71.8779 0.0646362C71.8779 17.118 58.0534 30.9426 41 30.9426"
  },
  {
    id: "pentest",
    d: "M20.366 10.1298H30.6829C42.0383 10.1298 51.2437 19.3351 51.2437 30.6906C51.2437 42.046 42.0383 51.2513 30.6829 51.2513C19.3274 51.2513 10.1221 42.046 10.1221 30.6906V82.0436"
  },
  {
    id: "flow",
    d: "M61.3701 10.5157H40.9951C16.2951 10.5157 10.1201 31.099 10.1201 41.3907V81.9811M40.9951 50.7657H61.3701"
  },
  {
    id: "marketing",
    d: "M71.751 0C71.751 17.0534 57.9265 30.8779 40.873 30.8779C23.8196 30.8779 9.99512 17.0534 9.99512 0V81.9811M71.7665 36.1279L71.6221 81.9124"
  },
  {
    id: "project",
    d: "M30.6809 51.2513C42.0363 51.2513 51.2417 42.046 51.2417 30.6905C51.2417 19.3351 42.0363 10.1298 30.6809 10.1298C19.3255 10.1298 10.1201 19.3351 10.1201 30.6906L10.1201 81.9968"
  }
]

export const Logo = forwardRef<SVGSVGElement, LogoProps>(({ className, all = false, id = "kalit" }, ref) => {
  const title = all ? "Kalit — Product Family" : LOGO_TITLES[id]
  const visibleIds = all ? LOGO_PATHS.map((item) => item.id) : [id]

  return (
    <svg className={clsx(s.logo, className)} ref={ref} viewBox="0 0 82 82">
      <title>{title}</title>
      {LOGO_PATHS.filter((path) => visibleIds.includes(path.id)).map((path) => (
        <path key={path.id} data-logo-id={path.id} d={path.d} />
      ))}
    </svg>
  )
})
