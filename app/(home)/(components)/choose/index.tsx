"use client"

import { Container } from "@/components/container"
import { Heading } from "@/components/heading"
import { Icon } from "@/components/icon"
import { Logotype } from "@/components/logotype"
import { useGSAP } from "@gsap/react"
import clsx from "clsx"
import gsap from "gsap"
import Image from "next/image"
import { useRef } from "react"
import s from "./choose.module.scss"

const Check = () => {
  return <Icon icon="hugeicons:tick-02" className={s.check} />
}

const Cross = () => {
  return <Icon icon="hugeicons:cancel-circle" className={s.cross} />
}

export const Choose = () => {
  const iconCol = [
    "hugeicons:apple-reminder",
    "hugeicons:global",
    "hugeicons:megaphone-02",
    "hugeicons:shield-01",
    "hugeicons:user-group",
    "hugeicons:keyframes-multiple-add",
    "hugeicons:rocket-01",
    "hugeicons:magic-wand-01",
    "hugeicons:artificial-intelligence-03",
    "hugeicons:chart-breakout-circle"
  ] as const

  const rows = [
    {
      label: "Build Full Apps",
      description: "End-to-end app development from a prompt"
    },
    {
      label: "Launch Websites",
      description: "Generate and publish landing pages"
    },
    {
      label: "Marketing Workflows",
      description: "Create and run acquisition campaigns"
    },
    {
      label: "Security Scanning",
      description: "Automated vulnerability detection and fixes"
    },
    {
      label: "Multi-Agent Execution",
      description: "Specialized agents working together"
    },
    {
      label: "Parallel Tasks",
      description: "Run multiple workflows simultaneously"
    },
    {
      label: "Deployment Included",
      description: "Ship to production in one click"
    },
    {
      label: "Beginner Friendly",
      description: "Accessible for non-technical founders"
    },
    {
      label: "AI Strategic Planning",
      description: "AI-driven project architecture and roadmap"
    },
    {
      label: "End-to-End Workflow",
      description: "From idea to live product in one platform"
    }
  ] as const

  const columns = [
    {
      key: "iconCol",
      isIconCol: true,
      cells: iconCol
    },
    {
      key: "labels",
      isLabel: true,
      cells: rows
    },
    {
      key: "kalit",
      isKalit: true,
      cells: ["check", "check", "check", "check", "check", "check", "check", "check", "check", "check"]
    },
    {
      key: "col-1",
      logo: "lovable",
      cells: ["check", "check", "cross", "cross", "cross", "cross", "check", "check", "cross", "cross"]
    },
    {
      key: "col-2",
      logo: "bolt",
      cells: ["check", "check", "cross", "cross", "cross", "cross", "check", "check", "cross", "cross"]
    },
    {
      key: "col-3",
      logo: "replit",
      cells: ["check", "cross", "cross", "cross", "cross", "cross", "check", "cross", "cross", "cross"]
    },
    {
      key: "col-4",
      logo: "base44",
      cells: ["check", "cross", "cross", "cross", "cross", "cross", "cross", "check", "cross", "cross"]
    },
    {
      key: "col-5",
      logo: "claude",
      cells: ["cross", "cross", "cross", "cross", "cross", "cross", "cross", "cross", "check", "cross"]
    }
  ] as const

  const line1Ref = useRef<SVGPathElement>(null)
  const line2Ref = useRef<SVGPathElement>(null)

  useGSAP(() => {
    gsap.fromTo(
      line1Ref.current,
      { "--dash-offset": 2 },
      {
        "--dash-offset": 0,
        duration: 4,
        ease: "power1.inOut",
        scrollTrigger: {
          trigger: line1Ref.current,
          start: "top bottom",
          once: true
        }
      }
    )
    gsap.fromTo(
      line2Ref.current,
      { "--dash-offset": 2 },
      {
        "--dash-offset": 0,
        duration: 4,
        ease: "power1.inOut",
        scrollTrigger: {
          trigger: line2Ref.current,
          start: "top bottom",
          once: true
        }
      }
    )
  }, [])

  return (
    <section className={s.choose}>
      <Container>
        <Heading
          className={s.heading}
          subtitle="Compare"
          paragraph="Compare Kalit with other tools across the capabilities that matter most to founders and digital teams."
        >
          Why choose{" "}
          <span data-icon="right">
            Kalit?
            <span data-icon-svg>
              <Icon icon="kalit" />
            </span>
          </span>
          <svg viewBox="0 0 941 241" className={clsx(s.line, s.line1)}>
            <path
              ref={line1Ref}
              pathLength={1}
              d="M6.5 240.5V224.501C6.5 202.41 24.4086 184.501 46.5 184.501H361.5C383.591 184.501 401.5 166.592 401.5 144.501V87C401.5 72.3645 389.636 60.5 375 60.5C360.364 60.5 348.5 72.3645 348.5 87C348.5 101.636 360.364 113.5 375 113.5H634.5C656.591 113.5 674.5 95.5914 674.5 73.5V46.5C674.5 24.4086 692.409 6.5 714.5 6.5H1224.19"
              stroke="url(#choose_line)"
            />
          </svg>
        </Heading>
        <div className={s.tableContainer}>
          <div className={s.table}>
            {columns.map((column) => (
              <div
                key={column.key}
                className={clsx(
                  s.col,
                  "isIconCol" in column && column.isIconCol && s.iconCol,
                  "isLabel" in column && column.isLabel && s.label,
                  "isKalit" in column && column.isKalit && s.kalit
                )}
              >
                {"isKalit" in column && column.isKalit && <Logotype className={s.logotype} />}

                {"logo" in column && column.logo && (
                  <div className={s.logo}>
                    <Image src={`/img/${column.logo}.png`} alt={column.logo} width={95} height={42} quality={80} />
                  </div>
                )}

                {column.cells.map((cell, index) => {
                  if ("isIconCol" in column && column.isIconCol) {
                    return (
                      <div key={`${column.key}-${index}`} className={s.row}>
                        <Icon icon={cell as string} className={s.icon} />
                      </div>
                    )
                  }
                  if (typeof cell === "object") {
                    return (
                      <div key={`${column.key}-${index}`} className={s.row}>
                        <div className={s.title}>
                          <div className={s.right}>
                            <div className={s.name}>{cell.label}</div>
                            <div className={s.description}>{cell.description}</div>
                          </div>
                        </div>
                      </div>
                    )
                  }
                  return (
                    <div key={`${column.key}-${index}`} className={s.row}>
                      {cell === "check" && <Check />}
                      {cell === "cross" && <Cross />}
                    </div>
                  )
                })}
                {"isKalit" in column && column.isKalit && <div className={s.bg} />}
              </div>
            ))}
            <div className={s.tableBg} />
          </div>
        </div>
        <svg viewBox="0 0 942 189" className={clsx(s.line, s.line2)}>
          <path
            ref={line2Ref}
            pathLength={1}
            d="M6.5 0V43C6.5 65.0914 24.4086 83 46.5 83H206.5C228.591 83 246.5 100.909 246.5 123V160.5C246.5 172.374 236.874 182 225 182C213.126 182 203.5 172.374 203.5 160.5V160C203.5 147.85 213.35 138 225.5 138H575.5H1321.19"
            stroke="url(#choose_line)"
          />
        </svg>
      </Container>
    </section>
  )
}
