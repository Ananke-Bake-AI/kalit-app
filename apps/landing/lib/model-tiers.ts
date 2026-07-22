import "server-only"
import { prisma } from "./prisma"

// Model access shown on the pricing page — derived LIVE from the broker-owned
// `flow_models` table (the same catalogue the admin edits), never hardcoded, so a
// model added / re-tiered / disabled in /admin/models updates the pricing matrix
// on its own. Access is CUMULATIVE: a tier gets its models + all lower tiers.

export const MODEL_TIERS = ["free", "starter", "pro", "enterprise"] as const
export type ModelTier = (typeof MODEL_TIERS)[number]

export function tierRank(t: string): number {
  const i = MODEL_TIERS.indexOf(t as ModelTier)
  return i < 0 ? 0 : i
}

export interface ModelRow {
  id: string
  label: string
  provider: string
  groupLabel: string
  minTier: string
}

// Public catalogue read: enabled + non-admin-only models only. Never throws — on
// any DB error it returns [] and the pricing matrix simply doesn't render.
export async function getPublicModels(): Promise<ModelRow[]> {
  try {
    const rows = await prisma.$queryRaw<
      { id: string; label: string; provider: string; group_label: string; min_tier: string }[]
    >`SELECT id, label, provider, group_label, min_tier
      FROM flow_models
      WHERE enabled = true AND admin_only = false
      ORDER BY sort_order, group_label, label`
    return rows.map((r) => ({
      id: r.id,
      label: r.label,
      provider: r.provider,
      groupLabel: r.group_label,
      minTier: r.min_tier,
    }))
  } catch {
    return []
  }
}

// Display casing for known brand tokens — cosmetic only; an unknown brand falls
// back to Title Case, so this is NOT a hardcoded model list (new brands still show).
const BRAND_CASE: Record<string, string> = {
  glm: "GLM",
  gpt: "GPT-OSS",
  minimax: "MiniMax",
  deepseek: "DeepSeek",
  qwen: "Qwen",
  kimi: "Kimi",
}
const titleCase = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s)

// family = a stable brand grouping DERIVED from the model — no per-model hardcoding.
// Claude is identified by the anthropic id/provider (NOT a "claude" substring, so a
// "Qwen … (Claude-distill)" model isn't mis-grouped) and split by sub-brand because
// opus/sonnet vs fable sit on different tiers. Everything else groups by the leading
// brand token of the label.
export function familyOf(m: ModelRow): string {
  if (m.id.startsWith("anthropic:") || m.provider === "anthropic") {
    const sub = (m.label || m.id).toLowerCase().match(/\b(opus|sonnet|haiku|fable)\b/)
    return sub ? `Claude ${titleCase(sub[1])}` : "Claude"
  }
  const brand = (m.label || m.id).toLowerCase().replace(/^[a-z]+\//, "").match(/[a-z]+/)?.[0] ?? "other"
  return BRAND_CASE[brand] ?? titleCase(brand)
}

export interface MatrixRow {
  family: string
  // rank = lowest tier among the family's models (the tier it first unlocks at).
  rank: number
}

// One row per family, rank = the minimum min_tier of its models, sorted by tier
// then name. A cell is checked when the column's tier rank >= the family's rank.
export function modelMatrix(models: ModelRow[]): MatrixRow[] {
  const byFamily = new Map<string, number>()
  for (const m of models) {
    const fam = familyOf(m)
    const r = tierRank(m.minTier)
    byFamily.set(fam, byFamily.has(fam) ? Math.min(byFamily.get(fam)!, r) : r)
  }
  return [...byFamily.entries()]
    .map(([family, rank]) => ({ family, rank }))
    .sort((a, b) => a.rank - b.rank || a.family.localeCompare(b.family))
}
