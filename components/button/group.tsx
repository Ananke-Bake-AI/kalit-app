import clsx from "clsx"
import s from "./button.module.scss"

interface ButtonGroupProps {
  children: React.ReactNode
  direction?: "row" | "column"
  className?: string
}

export const ButtonGroup = ({ children, className, direction = "row" }: ButtonGroupProps) => {
  return <div className={clsx(s.group, className, direction === "column" && s.column)}>{children}</div>
}
