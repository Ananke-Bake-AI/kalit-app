"use client"

import { SUITES, type SuiteId } from "@/lib/suites"
import { useI18n } from "@/stores/i18n"
import { Logo } from "@/components/logo"
import { Icon } from "@/components/icon"
import s from "./welcome-screen.module.scss"

const QUICK_PROMPT_KEYS: { suite: SuiteId; keys: string[] }[] = [
  { suite: "flow", keys: ["studio.promptFlow1", "studio.promptFlow2", "studio.promptFlow3"] },
  { suite: "project", keys: ["studio.promptProject1", "studio.promptProject2", "studio.promptProject3"] },
  { suite: "marketing", keys: ["studio.promptMarketing1", "studio.promptMarketing2"] },
  { suite: "pentest", keys: ["studio.promptPentest1", "studio.promptPentest2"] },
  { suite: "search", keys: ["studio.promptSearch1", "studio.promptSearch2"] },
]

interface WelcomeScreenProps {
  onPromptSelect: (prompt: string, suiteId?: SuiteId) => void
  activeSuite?: SuiteId | null
}

export function WelcomeScreen({ onPromptSelect, activeSuite }: WelcomeScreenProps) {
  const { t } = useI18n()
  const suitesToShow = activeSuite
    ? QUICK_PROMPT_KEYS.filter((s) => s.suite === activeSuite)
    : QUICK_PROMPT_KEYS

  return (
    <div className={s.container}>
      <div className={s.hero}>
        <h1 className={s.title}>{t("studio.welcomeTitle")}</h1>
        <p className={s.subtitle}>{t("studio.welcomeSubtitle")}</p>
      </div>

      <div className={s.suites}>
        {suitesToShow.map(({ suite, keys }) => {
          const config = SUITES.find((c) => c.id === suite)
          if (!config) return null

          return (
            <div key={suite} className={s.suiteGroup}>
              <div className={s.suiteHeader} style={{ "--suite-color": config.color } as React.CSSProperties}>
                <Logo id={suite} width={20} height={20} />
                <span className={s.suiteName}>{config.title}</span>
              </div>
              <div className={s.promptList}>
                {keys.map((key) => {
                  const prompt = t(key)
                  return (
                    <button
                      key={key}
                      className={s.promptCard}
                      style={{ "--suite-color": config.color } as React.CSSProperties}
                      onClick={() => onPromptSelect(prompt, suite)}
                    >
                      <span>{prompt}</span>
                      <Icon icon="hugeicons:arrow-right-01" />
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
