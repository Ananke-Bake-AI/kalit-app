// Modèles proposés dans le studio. Le worker de génération RAM tourne via le
// token OAuth Claude (abonnement) → seuls les modèles Claude sont réellement
// exécutables aujourd'hui (la gateway kimi/qwen n'est pas déployée). On n'expose
// donc que la famille Claude ; défaut = Opus 4.8 (ce que le worker exécute).
// `id` = ce qu'on envoie au broker ; le broker mappe `anthropic:claude-x` → `claude-x`.

export interface ModelDef { id: string; label: string; provider: 'ollama' | 'anthropic' | 'mistral' | 'openai'; }
export interface ModelGroup { label: string; models: ModelDef[]; }

export const MODEL_GROUPS: ModelGroup[] = [
  {
    label: 'Claude',
    models: [
      { id: 'anthropic:claude-opus-4-8', label: 'Claude Opus 4.8', provider: 'anthropic' },
      { id: 'anthropic:claude-sonnet-4-6', label: 'Claude Sonnet 4.6', provider: 'anthropic' },
      { id: 'anthropic:claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5', provider: 'anthropic' },
    ],
  },
];

export const DEFAULT_MODEL_ID = 'anthropic:claude-opus-4-8';
export const ALL_MODELS = MODEL_GROUPS.flatMap((g) => g.models);
export function labelFor(id: string): string { return ALL_MODELS.find((m) => m.id === id)?.label ?? id; }
