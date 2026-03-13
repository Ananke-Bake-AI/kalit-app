import { useMemo } from "react"

const DEFAULT_COLORS = ["var(--color-1)", "var(--color-2)", "var(--color-3)", "var(--color-4)"]

type GradientDirection =
  | "to-right"
  | "to-left"
  | "to-bottom"
  | "to-top"
  | "to-top-right"
  | "to-top-left"
  | "to-bottom-right"
  | "to-bottom-left"

interface LinearGradientProps {
  id: string
  x1?: number
  y1?: number
  x2?: number
  y2?: number
  animated?: boolean
  gradientUnits?: "userSpaceOnUse" | "objectBoundingBox"
  direction?: GradientDirection
  stops?:
    | {
        offset: number
        color: string
      }[]
    | string[]
}

export const LinearGradient = ({
  id,
  x1,
  y1,
  x2,
  y2,
  animated = false,
  gradientUnits = "userSpaceOnUse",
  direction,
  stops
}: LinearGradientProps) => {
  const effectiveStops = stops && stops.length > 0 ? stops : DEFAULT_COLORS
  const hasOffsets = effectiveStops.length > 0 && typeof effectiveStops[0] === "object"

  const normalizedStops = useMemo(
    () =>
      hasOffsets
        ? (effectiveStops as { offset: number; color: string }[])
        : (effectiveStops as string[]).map((color, index, array) => {
            const count = array.length
            const offset = count === 1 ? 0 : index / (count - 1)

            return {
              offset,
              color
            }
          }),
    [hasOffsets, effectiveStops]
  )

  const isUserSpaceOnUse = gradientUnits === "userSpaceOnUse"

  const max = isUserSpaceOnUse ? 1 : 1

  const [computedX1, computedY1, computedX2, computedY2] = (() => {
    switch (direction) {
      case "to-right":
        return [0, max / 2, max, max / 2]
      case "to-left":
        return [max, max / 2, 0, max / 2]
      case "to-bottom":
        return [max / 2, 0, max / 2, max]
      case "to-top":
        return [max / 2, max, max / 2, 0]
      case "to-top-right":
        return [0, max, max, 0]
      case "to-top-left":
        return [max, max, 0, 0]
      case "to-bottom-right":
        return [0, 0, max, max]
      case "to-bottom-left":
        return [max, 0, 0, max]
      default:
        return [x1 ?? 0, y1 ?? 0, x2 ?? max, y2 ?? max]
    }
  })()

  return (
    <linearGradient
      id={id}
      x1={x1 ?? computedX1}
      y1={y1 ?? computedY1}
      x2={x2 ?? computedX2}
      y2={y2 ?? computedY2}
      gradientUnits={gradientUnits}
    >
      {normalizedStops.map((stop) => (
        <stop
          key={stop.offset}
          offset={stop.offset}
          {...(stop.color !== "var(--text)" && animated && { "data-stop-animated": stop.color })}
          style={{ stopColor: stop.color }}
        />
      ))}
    </linearGradient>
  )
}
