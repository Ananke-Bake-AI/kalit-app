import { LinearGradient } from "@/components/svg/linear-gradient"
import { RadialGradient } from "@/components/svg/radial-gradient"
import s from "./wrapper.module.scss"

export const Defs = () => {
  return (
    <svg aria-hidden="true" width="0" height="0" className={s.defs}>
      <defs>
        <LinearGradient
          id="button-stroke"
          x1={47.0547}
          y1={7.23981}
          x2={5.28623}
          y2={40.1964}
          gradientUnits="userSpaceOnUse"
        />
        <LinearGradient
          id="hero-line_1"
          gradientUnits="userSpaceOnUse"
          x1={529.607}
          y1={350.5}
          x2={-4.39255}
          y2={6.49997}
          stops={[
            { offset: 0, color: "var(--color-1)" },
            { offset: 0.5, color: "var(--color-2)" },
            { offset: 0.75, color: "var(--color-3)" },
            { offset: 1, color: "var(--color-4)" }
          ]}
        />
        <LinearGradient
          id="hero-line_2"
          gradientUnits="userSpaceOnUse"
          x1={0}
          y1={366.5}
          x2={485.929}
          y2={-30.7928}
          stops={[
            { offset: 0, color: "var(--color-1)" },
            { offset: 0.5, color: "var(--color-2)" },
            { offset: 0.75, color: "var(--color-3)" },
            { offset: 1, color: "var(--color-4)" }
          ]}
        />
        <LinearGradient
          id="color-1_1"
          gradientUnits="userSpaceOnUse"
          x1={529.607}
          y1={350.5}
          x2={-4.39255}
          y2={6.49997}
          stops={[
            { offset: 0, color: "var(--color-1)" },
            { offset: 1, color: "var(--color-1-secondary)" }
          ]}
        />
        <LinearGradient
          id="color-1_2"
          gradientUnits="userSpaceOnUse"
          x1={0}
          y1={366.5}
          x2={485.929}
          y2={-30.7928}
          stops={[
            { offset: 0, color: "var(--color-1)" },
            { offset: 1, color: "var(--color-1-secondary)" }
          ]}
        />
        <LinearGradient
          id="color-2_1"
          gradientUnits="userSpaceOnUse"
          x1={529.607}
          y1={350.5}
          x2={-4.39255}
          y2={6.49997}
          stops={[
            { offset: 0, color: "var(--color-2)" },
            { offset: 1, color: "var(--color-2-secondary)" }
          ]}
        />
        <LinearGradient
          id="color-2_2"
          gradientUnits="userSpaceOnUse"
          x1={0}
          y1={366.5}
          x2={485.929}
          y2={-30.7928}
          stops={[
            { offset: 0, color: "var(--color-2)" },
            { offset: 1, color: "var(--color-2-secondary)" }
          ]}
        />
        <LinearGradient
          id="color-3_1"
          gradientUnits="userSpaceOnUse"
          x1={529.607}
          y1={350.5}
          x2={-4.39255}
          y2={6.49997}
          stops={[
            { offset: 0, color: "var(--color-3)" },
            { offset: 1, color: "var(--color-3-secondary)" }
          ]}
        />
        <LinearGradient
          id="color-3_2"
          gradientUnits="userSpaceOnUse"
          x1={0}
          y1={366.5}
          x2={485.929}
          y2={-30.7928}
          stops={[
            { offset: 0, color: "var(--color-3)" },
            { offset: 1, color: "var(--color-3-secondary)" }
          ]}
        />
        <LinearGradient
          id="color-4_1"
          gradientUnits="userSpaceOnUse"
          x1={529.607}
          y1={350.5}
          x2={-4.39255}
          y2={6.49997}
          stops={[
            { offset: 0, color: "var(--color-4)" },
            { offset: 1, color: "var(--color-4-secondary)" }
          ]}
        />
        <LinearGradient
          id="color-4_2"
          gradientUnits="userSpaceOnUse"
          x1={0}
          y1={366.5}
          x2={485.929}
          y2={-30.7928}
          stops={[
            { offset: 0, color: "var(--color-4)" },
            { offset: 1, color: "var(--color-4-secondary)" }
          ]}
        />
        <LinearGradient
          id="architecture_line_1"
          gradientUnits="userSpaceOnUse"
          x1={6.74999}
          y1={626.822}
          x2={750.866}
          y2={6.75}
          stops={[
            { offset: 0, color: "var(--color-1)" },
            { offset: 0.33, color: "var(--color-2)" },
            { offset: 0.66, color: "var(--color-3)" },
            { offset: 1, color: "var(--color-4)" }
          ]}
        />
        <RadialGradient
          id="join_line_1"
          cx="0"
          cy="0"
          r="1"
          gradientTransform="matrix(395.238 162.341 -55.259 376.24 454.762 46.1593)"
          gradientUnits="userSpaceOnUse"
          stops={[
            { offset: 0, color: "var(--color-1)" },
            { offset: 0.33, color: "var(--color-2)" },
            { offset: 0.66, color: "var(--color-3)" },
            { offset: 1, color: "var(--color-4)" }
          ]}
        />
        <RadialGradient
          id="join_line_2"
          cx="0"
          cy="0"
          r="1"
          gradientTransform="matrix(-406.762 267.659 -314.812 -432.285 406.762 6.49997)"
          gradientUnits="userSpaceOnUse"
          stops={[
            { offset: 0, color: "var(--color-1)" },
            { offset: 0.33, color: "var(--color-2)" },
            { offset: 0.66, color: "var(--color-3)" },
            { offset: 1, color: "var(--color-4)" }
          ]}
        />
        <RadialGradient
          id="underline"
          cx="0"
          cy="0"
          r="1"
          gradientTransform="matrix(113.816 -6.06327 48.1492 27.3082 1.50049 13.421)"
          gradientUnits="userSpaceOnUse"
          stops={[
            { offset: 0.163893, color: "var(--color-1)" },
            { offset: 0.377558, color: "var(--color-2)" },
            { offset: 0.745238, color: "var(--color-3)" },
            { offset: 1, color: "var(--color-4)" }
          ]}
        />
        <LinearGradient
          id="try_line"
          direction="to-left"
          gradientUnits="objectBoundingBox"
          stops={[
            { offset: 0, color: "var(--color-1)" },
            { offset: 0.33, color: "var(--color-2)" },
            { offset: 0.66, color: "var(--color-3)" },
            { offset: 1, color: "var(--color-4)" }
          ]}
        />
        <LinearGradient
          id="choose_line"
          direction="to-right"
          gradientUnits="objectBoundingBox"
          stops={[
            { offset: 0, color: "var(--color-1)" },
            { offset: 0.33, color: "var(--color-2)" },
            { offset: 0.66, color: "var(--color-3)" },
            { offset: 1, color: "var(--color-4)" }
          ]}
        />
        {Array.from({ length: 4 }).map((_, i) => (
          <LinearGradient
            key={i}
            id={`color-${i + 1}`}
            direction="to-right"
            gradientUnits="objectBoundingBox"
            stops={[
              { offset: 0, color: `var(--color-${i + 1})` },
              { offset: 1, color: `var(--color-${i + 1}-secondary)` }
            ]}
          />
        ))}
        <LinearGradient
          id="color-1-accent"
          direction="to-right"
          gradientUnits="objectBoundingBox"
          stops={[
            { offset: 0, color: "var(--color-1)" },
            { offset: 1, color: "var(--color-1-secondary)" }
          ]}
        />
        <LinearGradient
          id="color-3-accent"
          direction="to-right"
          gradientUnits="objectBoundingBox"
          stops={[
            { offset: 0, color: "var(--color-3)" },
            { offset: 1, color: "var(--color-3-secondary)" }
          ]}
        />
        <LinearGradient
          id="color-4-accent"
          direction="to-right"
          gradientUnits="objectBoundingBox"
          stops={[
            { offset: 0, color: "var(--color-4)" },
            { offset: 1, color: "var(--color-4-secondary)" }
          ]}
        />
      </defs>
    </svg>
  )
}
