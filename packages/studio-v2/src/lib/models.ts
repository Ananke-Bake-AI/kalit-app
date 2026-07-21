// Modèles proposés dans le studio. `id` = ce qu'on envoie au broker.
//  - "anthropic:claude-x" → Claude via l'abonnement OAuth (premium).
//  - "cloud/<model>" / "deepseek/*" / "runpod/*" → gateway kalit-model-server.
//
// Gating par TIER : chaque modèle a un `minTier` (free/starter/pro/enterprise).
// deepseek=free · kimi/qwen/glm/minimax/gpt-oss/runpod=starter · Claude
// Opus/Sonnet=pro · Fable 5=enterprise. Le broker renvoie ce catalogue annoté de
// `available` (provider up) ET `locked` (au-dessus du tier de l'user) → le
// sélecteur grise les `locked`. L'enforcement réel est côté broker (flow_messages).
//
// SOURCE DE VÉRITÉ = le broker (GET /api/broker/models). La liste ci-dessous
// n'est qu'un FALLBACK affiché tant que le fetch n'a pas répondu (ou s'il échoue).
// Garder en phase avec broker/internal/models/catalog.go.

export type Tier = 'free' | 'starter' | 'pro' | 'enterprise';
export interface ModelDef {
  id: string;
  label: string;
  // Qui SERT le modèle (ollama, anthropic, deepseek, runpod, openai, mistral…).
  // Ouvert (l'admin peut ajouter n'importe quel provider) ; pilote la pastille.
  provider: string;
  minTier?: Tier;
  locked?: boolean;
  available?: boolean;
  paramsTotal?: string;  // indicatif (ex "1T")
  paramsActive?: string; // indicatif (ex "32B", params actifs MoE)
}
export interface ModelGroup { label: string; models: ModelDef[]; }

export const MODEL_GROUPS: ModelGroup[] = [
  {
    label: 'Ollama Cloud',
    models: [
      { id: 'cloud/kimi-k2.5:cloud', label: 'kimi-k2.5', provider: 'ollama', minTier: 'starter' },
      { id: 'cloud/kimi-k2.6:cloud', label: 'kimi-k2.6', provider: 'ollama', minTier: 'starter' },
      { id: 'cloud/kimi-k2.7-code:cloud', label: 'kimi-k2.7-code', provider: 'ollama', minTier: 'starter' },
      { id: 'cloud/qwen3-coder:480b-cloud', label: 'qwen3-coder 480b', provider: 'ollama', minTier: 'starter' },
      { id: 'cloud/deepseek-v3.2:cloud', label: 'deepseek-v3.2', provider: 'ollama', minTier: 'free' },
      { id: 'cloud/deepseek-v4-pro:cloud', label: 'deepseek-v4-pro', provider: 'ollama', minTier: 'free' },
      { id: 'cloud/deepseek-v4-flash:cloud', label: 'deepseek-v4-flash', provider: 'ollama', minTier: 'free' },
      { id: 'cloud/glm-5:cloud', label: 'glm-5', provider: 'ollama', minTier: 'starter' },
      { id: 'cloud/minimax-m3:cloud', label: 'minimax-m3', provider: 'ollama', minTier: 'starter' },
      { id: 'cloud/minimax-m2.5:cloud', label: 'minimax-m2.5', provider: 'ollama', minTier: 'starter' },
      { id: 'cloud/gpt-oss:120b-cloud', label: 'gpt-oss 120b', provider: 'ollama', minTier: 'starter' },
    ],
  },
  {
    label: 'DeepSeek',
    models: [
      // API DeepSeek native via la gateway (protocole openai-compatible, mais le
      // provider = DeepSeek). Accessible dès le tier FREE.
      { id: 'deepseek/deepseek-chat', label: 'deepseek-chat', provider: 'deepseek', minTier: 'free' },
      { id: 'deepseek/deepseek-reasoner', label: 'deepseek-reasoner', provider: 'deepseek', minTier: 'free' },
    ],
  },
  {
    // Modèles uncensored auto-hébergés (RunPod) via la gateway. Starter+.
    label: 'Permissive models',
    models: [
      { id: 'runpod/qwen-instruct', label: 'Qwen3.5 9B (Claude-distill) — uncensored', provider: 'runpod', minTier: 'starter' },
    ],
  },
  {
    label: 'Claude',
    models: [
      { id: 'anthropic:claude-opus-4-8', label: 'claude-opus-4.8', provider: 'anthropic', minTier: 'pro' },
      { id: 'anthropic:claude-sonnet-4-6', label: 'claude-sonnet-4-6', provider: 'anthropic', minTier: 'pro' },
      { id: 'anthropic:claude-opus-4-6', label: 'claude-opus-4-6', provider: 'anthropic', minTier: 'pro' },
      { id: 'anthropic:claude-fable-5', label: 'claude-fable-5', provider: 'anthropic', minTier: 'enterprise' },
    ],
  },
];

// Tous les modèles sont visibles ; le grisage des `locked` (au-dessus du tier)
// vient de la réponse annotée du broker. Le fallback (avant fetch) montre tout
// non-grisé — l'enforcement broker reste la barrière réelle. `isAdmin` est gardé
// pour compat de signature (plus de filtrage front).
export function modelGroupsFor(_isAdmin: boolean): ModelGroup[] {
  return MODEL_GROUPS;
}

// Défaut = deepseek-v4-flash : utilisable par le tier FREE (kimi est désormais
// starter+, il ne peut donc plus être le défaut d'un compte free).
export const DEFAULT_MODEL_ID = 'cloud/deepseek-v4-flash:cloud';
export const ALL_MODELS = MODEL_GROUPS.flatMap((g) => g.models);
export function labelFor(id: string): string { return ALL_MODELS.find((m) => m.id === id)?.label ?? id; }
