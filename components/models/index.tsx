import clsx from "clsx"
import { Sprite } from "../sprite"
import s from "./models.module.scss"

interface ModelsProps {
  className?: string
}

export const Models = ({ className }: ModelsProps) => {
  return (
    <div className={clsx(s.list, className)}>
      <Sprite className={s.openai} id="open-ai" viewBox="0 0 89 23" />
      <Sprite className={s.anthropic} id="anthropic" viewBox="0 0 143 16" />
      <Sprite className={s.google} id="google" viewBox="0 0 88 30" />
    </div>
  )
}
