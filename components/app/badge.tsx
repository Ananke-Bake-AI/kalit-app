import { cn } from "@/lib/cn"

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "success" | "warning" | "destructive"
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        {
          "bg-muted text-muted-fg": variant === "default",
          "bg-green-500/10 text-green-400": variant === "success",
          "bg-yellow-500/10 text-yellow-400": variant === "warning",
          "bg-red-500/10 text-red-400": variant === "destructive",
        },
        className
      )}
      {...props}
    />
  )
}
