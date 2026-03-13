import clsx from "clsx"
import s from "./button.module.scss"

interface ButtonGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  direction?: "row" | "column"
  className?: string
}

export const ButtonGroup = ({ children, className, direction = "row", ...props }: ButtonGroupProps) => {
  return (
    <div {...props} className={clsx(s.group, className, direction === "column" && s.column)}>
      {children}
    </div>
  )
}
