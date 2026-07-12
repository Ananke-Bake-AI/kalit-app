// Modèles proposés dans le studio. `id` = ce qu'on envoie au broker.
//  - "anthropic:claude-x" → Claude via l'abonnement OAuth (premium) → réservé aux
//    comptes Pro+ (flag `pro`). Le broker downgrade en kimi pour les comptes < Pro.
//  - "cloud/<model>"       → routé vers la gateway kalit-model-server (Ollama Cloud),
//    dispo pour tous. Défaut = kimi-2.5.

export interface ModelDef { id: string; label: string; provider: 'ollama' | 'anthropic' | 'mistral' | 'openai'; pro?: boolean; admin?: boolean; }
export interface ModelGroup { label: string; models: ModelDef[]; }

export const MODEL_GROUPS: ModelGroup[] = [
  {
    label: 'Ollama Cloud',
    models: [
      { id: 'cloud/kimi-k2.5:cloud', label: 'kimi-k2.5', provider: 'ollama' },
      { id: 'cloud/kimi-k2.6:cloud', label: 'kimi-k2.6', provider: 'ollama' },
      { id: 'cloud/kimi-k2.7-code:cloud', label: 'kimi-k2.7-code', provider: 'ollama' },
      { id: 'cloud/qwen3-coder:480b-cloud', label: 'qwen3-coder 480b', provider: 'ollama' },
      { id: 'cloud/deepseek-v3.2:cloud', label: 'deepseek-v3.2', provider: 'ollama' },
      { id: 'cloud/deepseek-v4-pro:cloud', label: 'deepseek-v4-pro', provider: 'ollama' },
      { id: 'cloud/glm-5:cloud', label: 'glm-5', provider: 'ollama' },
      { id: 'cloud/minimax-m3:cloud', label: 'minimax-m3', provider: 'ollama' },
      { id: 'cloud/minimax-m2.5:cloud', label: 'minimax-m2.5', provider: 'ollama' },
      { id: 'cloud/gpt-oss:120b-cloud', label: 'gpt-oss 120b', provider: 'ollama' },
    ],
  },
  {
    label: 'Claude (Pro)',
    models: [
      { id: 'anthropic:claude-opus-4-8', label: 'claude-opus-4.8', provider: 'anthropic', pro: true },
      { id: 'anthropic:claude-sonnet-4-6', label: 'claude-sonnet-4-6', provider: 'anthropic', pro: true },
      { id: 'anthropic:claude-opus-4-6', label: 'claude-opus-4-6', provider: 'anthropic', pro: true },
      // Admin-only (expérimental) — visible et sélectionnable uniquement par un admin.
      { id: 'anthropic:claude-fable-5', label: 'claude-fable-5', provider: 'anthropic', pro: true, admin: true },
    ],
  },
];

// Modèles visibles pour un user donné : les modèles admin-only sont masqués aux non-admins.
export function modelGroupsFor(isAdmin: boolean): ModelGroup[] {
  if (isAdmin) return MODEL_GROUPS;
  return MODEL_GROUPS
    .map((g) => ({ ...g, models: g.models.filter((m) => !m.admin) }))
    .filter((g) => g.models.length > 0);
}

export const DEFAULT_MODEL_ID = 'cloud/kimi-k2.5:cloud';
export const ALL_MODELS = MODEL_GROUPS.flatMap((g) => g.models);
export function labelFor(id: string): string { return ALL_MODELS.find((m) => m.id === id)?.label ?? id; }
