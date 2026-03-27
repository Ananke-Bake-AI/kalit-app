import { Icon } from "@/components/icon"
import clsx from "clsx"
import s from "./how.module.scss"

interface StepProps {
  icon: string
  number: number
  title: string
  description: string
}

export const Step = ({ icon, number, title, description }: StepProps) => {
  return (
    <div className={clsx(s.step, s[`step${number}`])} data-reveal>
      <div className={s.top}>
        <Icon icon={icon} />
        <div className={s.number}>0{number}</div>
      </div>
      <div className={s.content}>
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
    </div>
  )
}
