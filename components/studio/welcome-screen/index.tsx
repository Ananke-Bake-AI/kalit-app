"use client"

import { useState } from "react"
import { SUITES, type SuiteId } from "@/lib/suites"
import { useI18n } from "@/stores/i18n"
import { useStudioStore } from "@/stores/studio"
import { Logo } from "@/components/logo"
import { Icon } from "@/components/icon"
import { ImportRepoModal } from "@/components/studio/import-repo-modal"
import s from "./welcome-screen.module.scss"

// Each entry: short `labelKey` for the card UI + richer `promptKey` that
// gets prefilled into the chat input when the card is clicked. The prefill
// reads as a partial sentence the user can continue (e.g. "Build a portfolio
// website to showcase my "), so the assistant gets enough context but the
// user still drives the specifics.
const QUICK_PROMPT_KEYS: {
  suite: SuiteId
  entries: { labelKey: string; promptKey: string }[]
}[] = [
  {
    suite: "flow",
    entries: [
      { labelKey: "studio.promptFlow1", promptKey: "studio.promptFlow1Prompt" },
      { labelKey: "studio.promptFlow2", promptKey: "studio.promptFlow2Prompt" },
      { labelKey: "studio.promptFlow3", promptKey: "studio.promptFlow3Prompt" },
    ],
  },
  {
    suite: "project",
    entries: [
      { labelKey: "studio.promptProject1", promptKey: "studio.promptProject1Prompt" },
      { labelKey: "studio.promptProject2", promptKey: "studio.promptProject2Prompt" },
      { labelKey: "studio.promptProject3", promptKey: "studio.promptProject3Prompt" },
    ],
  },
  {
    suite: "marketing",
    entries: [
      { labelKey: "studio.promptMarketing1", promptKey: "studio.promptMarketing1Prompt" },
      { labelKey: "studio.promptMarketing2", promptKey: "studio.promptMarketing2Prompt" },
    ],
  },
  {
    suite: "pentest",
    entries: [
      { labelKey: "studio.promptPentest1", promptKey: "studio.promptPentest1Prompt" },
      { labelKey: "studio.promptPentest2", promptKey: "studio.promptPentest2Prompt" },
    ],
  },
  {
    suite: "search",
    entries: [
      { labelKey: "studio.promptSearch1", promptKey: "studio.promptSearch1Prompt" },
      { labelKey: "studio.promptSearch2", promptKey: "studio.promptSearch2Prompt" },
    ],
  },
]

interface WelcomeScreenProps {
  onPromptSelect: (prompt: string, suiteId?: SuiteId) => void
  activeSuite?: SuiteId | null
  onEnsureSession?: () => Promise<string | null>
}

export function WelcomeScreen({ onPromptSelect, activeSuite, onEnsureSession }: WelcomeScreenProps) {
  const { t } = useI18n()
  const [repoModalOpen, setRepoModalOpen] = useState(false)
  const activeSessionId = useStudioStore((st) => st.activeSessionId)
  const importedRepo = useStudioStore((st) => st.importedRepo)
  const suitesToShow = activeSuite
    ? QUICK_PROMPT_KEYS.filter((s) => s.suite === activeSuite)
    : QUICK_PROMPT_KEYS

  return (
    <div className={s.container}>
      <div className={s.hero}>
        <h1 className={s.title}>{t("studio.welcomeTitle")}</h1>
        <p className={s.subtitle}>{t("studio.welcomeSubtitle")}</p>
      </div>

      <button
        type="button"
        className={s.importCard}
        onClick={() => setRepoModalOpen(true)}
      >
        <div className={s.importIcon}>
          <Icon icon="hugeicons:github-01" />
        </div>
        <div className={s.importBody}>
          <div className={s.importTitle}>
            {importedRepo
              ? t("studio.importRepoAttached")
              : t("studio.importExistingProject")}
          </div>
          <div className={s.importDesc}>
            {importedRepo
              ? importedRepo.url
              : t("studio.importExistingProjectDesc")}
          </div>
        </div>
        <Icon icon="hugeicons:arrow-right-01" />
      </button>

      {repoModalOpen && (
        <ImportRepoModal
          sessionId={activeSessionId}
          onClose={() => setRepoModalOpen(false)}
          onEnsureSession={onEnsureSession}
        />
      )}

      <div className={s.suites}>
        {suitesToShow.map(({ suite, entries }) => {
          const config = SUITES.find((c) => c.id === suite)
          if (!config) return null

          return (
            <div key={suite} className={s.suiteGroup}>
              <div className={s.suiteHeader} style={{ "--suite-color": config.color } as React.CSSProperties}>
                <Logo id={suite} width={20} height={20} />
                <span className={s.suiteName}>{config.title}</span>
              </div>
              <div className={s.promptList}>
                {entries.map(({ labelKey, promptKey }) => (
                  <button
                    key={labelKey}
                    className={s.promptCard}
                    style={{ "--suite-color": config.color } as React.CSSProperties}
                    onClick={() => onPromptSelect(t(promptKey), suite)}
                  >
                    <span>{t(labelKey)}</span>
                    <Icon icon="hugeicons:arrow-right-01" />
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
