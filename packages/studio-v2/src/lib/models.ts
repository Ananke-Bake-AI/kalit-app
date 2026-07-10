// Modèles proposés dans le studio. `id` = ce qu'on envoie au broker.
//  - "anthropic:claude-x" → Claude via l'abonnement OAuth du worker.
//  - "cloud/<model>"       → routé vers la gateway kalit-model-server (Ollama Cloud).
// Le broker mappe et passe le modèle au worker (le "/" déclenche la gateway).
// Défaut = Opus 4.8 (ce que le worker exécute sans surcharge).

export interface ModelDef { id: string; label: string; provider: 'ollama' | 'anthropic' | 'mistral' | 'openai'; }
export interface ModelGroup { label: string; models: ModelDef[]; }

export const MODEL_GROUPS: ModelGroup[] = [
  {
    label: 'Claude (abonnement)',
    models: [
      { id: 'anthropic:claude-opus-4-8', label: 'claude-opus-4.8', provider: 'anthropic' },
      { id: 'anthropic:claude-sonnet-4-6', label: 'claude-sonnet-4-6', provider: 'anthropic' },
      { id: 'anthropic:claude-opus-4-6', label: 'claude-opus-4-6', provider: 'anthropic' },
      { id: 'anthropic:claude-haiku-4-5-20251001', label: 'claude-haiku-4.5', provider: 'anthropic' },
    ],
  },
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
      { id: 'cloud/minimax-m2.5:cloud', label: 'minimax-m2.5', provider: 'ollama' },
      { id: 'cloud/gpt-oss:120b-cloud', label: 'gpt-oss 120b', provider: 'ollama' },
    ],
  },
];

export const DEFAULT_MODEL_ID = 'anthropic:claude-opus-4-8';
export const ALL_MODELS = MODEL_GROUPS.flatMap((g) => g.models);
export function labelFor(id: string): string { return ALL_MODELS.find((m) => m.id === id)?.label ?? id; }
