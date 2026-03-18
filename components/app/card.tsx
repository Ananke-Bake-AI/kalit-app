import { cn } from "@/lib/cn"

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Card({ className, ...props }: CardProps) {
  return (
    <div
      className={cn("rounded-xl border border-border bg-card p-6", className)}
      {...props}
    />
  )
}
