import clsx from "clsx"
import { Models } from "."
import s from "./models.module.scss"

export interface PoweredProps {
  title: string
  className?: string
}

export const Powered = ({ title, className }: PoweredProps) => {
  return (
    <div className={clsx(s.ai, className)} data-reveal>
      <h2>{title}</h2>
      <Models />
    </div>
  )
}
