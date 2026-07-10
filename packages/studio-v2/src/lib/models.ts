// Modèles proposés (repris du sélecteur kalit). `id` = ce qu'on envoie au broker
// à la création de session; `provider` = groupe. kimi en défaut (Anthropic est
// souvent en 429 côté broker). Le taskforce (build) reste sur openai/anthropic.

export interface ModelDef { id: string; label: string; provider: 'ollama' | 'anthropic' | 'mistral' | 'openai'; }
export interface ModelGroup { label: string; models: ModelDef[]; }

export const MODEL_GROUPS: ModelGroup[] = [
  {
    label: 'Ollama cloud',
    models: [
      { id: 'kimi-k2.5:cloud', label: 'kimi-k2.5', provider: 'ollama' },
      { id: 'qwen3-coder:480b-cloud', label: 'qwen3-coder 480b', provider: 'ollama' },
      { id: 'deepseek-v3.2:cloud', label: 'deepseek-v3.2', provider: 'ollama' },
      { id: 'glm-5:cloud', label: 'glm-5', provider: 'ollama' },
      { id: 'minimax-m2.5:cloud', label: 'minimax-m2.5', provider: 'ollama' },
    ],
  },
  {
    label: 'Anthropic',
    models: [
      { id: 'anthropic:claude-sonnet-4-6', label: 'claude-sonnet-4-6', provider: 'anthropic' },
      { id: 'anthropic:claude-opus-4-6', label: 'claude-opus-4-6', provider: 'anthropic' },
      { id: 'anthropic:claude-haiku-4-5-20251001', label: 'claude-haiku-4.5', provider: 'anthropic' },
    ],
  },
  {
    label: 'OpenAI',
    models: [
      { id: 'openai:gpt-5.5', label: 'gpt-5.5', provider: 'openai' },
      { id: 'openai:gpt-4.1', label: 'gpt-4.1', provider: 'openai' },
      { id: 'openai:o4-mini', label: 'o4-mini', provider: 'openai' },
    ],
  },
  {
    label: 'Mistral',
    models: [
      { id: 'mistral:mistral-large-latest', label: 'mistral-large', provider: 'mistral' },
      { id: 'mistral:codestral-latest', label: 'codestral', provider: 'mistral' },
    ],
  },
];

export const DEFAULT_MODEL_ID = 'kimi-k2.5:cloud';
export const ALL_MODELS = MODEL_GROUPS.flatMap((g) => g.models);
export function labelFor(id: string): string { return ALL_MODELS.find((m) => m.id === id)?.label ?? id; }
