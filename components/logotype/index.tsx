import clsx from "clsx"
import { Logo } from "../logo"
import s from "./logotype.module.scss"

type LogotypeProps = {
  all?: boolean
  className?: string
}

export const Logotype = ({ className, all = false }: LogotypeProps) => {
  return (
    <div className={clsx(s.logo, className)}>
      <Logo all={all} id="kalit" />
      <span>kalit</span>
    </div>
  )
}
