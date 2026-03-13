import { useMemo } from "react"

const DEFAULT_COLORS = ["var(--color-1)", "var(--color-2)", "var(--color-3)", "var(--color-4)"]

interface RadialGradientProps {
  id: string
  cx?: number | string
  cy?: number | string
  r?: number | string
  fx?: number | string
  fy?: number | string
  animated?: boolean
  gradientUnits?: "userSpaceOnUse" | "objectBoundingBox"
  gradientTransform?: string
  stops?:
    | {
        offset: number | string
        color: string
      }[]
    | string[]
}

export const RadialGradient = ({
  id,
  cx = 0,
  cy = 0,
  r = 1,
  fx,
  fy,
  animated = false,
  gradientUnits = "userSpaceOnUse",
  gradientTransform,
  stops
}: RadialGradientProps) => {
  const effectiveStops = stops && stops.length > 0 ? stops : DEFAULT_COLORS
  const hasOffsets = effectiveStops.length > 0 && typeof effectiveStops[0] === "object"

  const normalizedStops = useMemo(
    () =>
      hasOffsets
        ? (effectiveStops as { offset: number | string; color: string }[])
        : (effectiveStops as string[]).map((color, index, array) => {
            const count = array.length
            const offset = count === 1 ? 0 : index / (count - 1)

            return {
              offset,
              color
            }
          }),
    [effectiveStops, hasOffsets]
  )

  return (
    <radialGradient
      id={id}
      cx={cx}
      cy={cy}
      r={r}
      fx={fx}
      fy={fy}
      gradientUnits={gradientUnits}
      gradientTransform={gradientTransform}
    >
      {normalizedStops.map((stop) => (
        <stop
          key={stop.offset}
          offset={stop.offset}
          {...(stop.color !== "var(--text)" && animated && { "data-stop-animated": stop.color })}
          style={{ stopColor: stop.color }}
        />
      ))}
    </radialGradient>
  )
}
