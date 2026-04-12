export const FUN_MESSAGE_KEYS = [
  "studio.funMsg1",
  "studio.funMsg2",
  "studio.funMsg3",
  "studio.funMsg4",
  "studio.funMsg5",
  "studio.funMsg6",
  "studio.funMsg7",
  "studio.funMsg8",
  "studio.funMsg9",
  "studio.funMsg10",
]

/** Progressive backoff: 0 (immediate) -> 3s -> 6s -> 15s -> 30s -> 60s */
export function getPollInterval(attempt: number): number {
  if (attempt === 0) return 0
  if (attempt >= 120) return 60000
  if (attempt >= 60) return 30000
  if (attempt >= 30) return 15000
  if (attempt >= 15) return 6000
  return 3000
}

export function formatElapsed(startedAt: string | null, t: (key: string) => string): string | null {
  if (!startedAt) return null
  const elapsed = Date.now() - new Date(startedAt).getTime()
  if (elapsed < 0) return null
  const seconds = Math.floor(elapsed / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  if (hours > 0) return `${hours}h ${minutes % 60}m ${t("studio.elapsed")}`
  if (minutes > 0) return `${minutes}m ${seconds % 60}s ${t("studio.elapsed")}`
  return `${seconds}s ${t("studio.elapsed")}`
}

export const PHASE_LABEL_KEYS: Record<string, string> = {
  planning: "studio.phasePlanning",
  working: "studio.phaseBuilding",
  testing: "studio.phaseTesting",
  reviewing: "studio.phaseReviewing",
  deploying: "studio.phaseDeploying",
  done: "studio.phaseDone",
  error: "studio.phaseError",
  unknown: "studio.phaseWorking",
}

export interface TaskStats {
  total: number
  done: number
  inProgress: number
  todo: number
}

export interface PollData {
  phase: string | null
  tasks: TaskStats | null
  startedAt: string | null
  estimatedEndAt: string | null
  tokensSpent: number
  totalWorkDurationMs: number
}

export function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  const h = Math.floor(m / 60)
  if (h > 0) return `${h}h ${m % 60}m`
  if (m > 0) return `${m}m ${s % 60}s`
  return `${s}s`
}
