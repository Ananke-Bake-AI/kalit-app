// Interface client minimale attendue par l'adaptateur. En prod (kalit), on
// passe le vrai @kalit/broker-client (même forme). En dev (harnais), on utilise
// createDevClient ci-dessous. L'adaptateur ne dépend que de cette interface.

export interface BrokerClient {
  fetch: (path: string, options?: RequestInit) => Promise<Response>;
  connectWebSocket: () => Promise<WebSocket>;
}

export interface DevClientConfig {
  /** Résout le JWT courant (dev: token pré-minté; prod: /api/broker/token). */
  getToken: () => Promise<string | null>;
  /** Base HTTP; '' = same-origin (proxifié par Vite vers le broker). */
  baseUrl?: string;
  /** Origine WS absolue; '' = same-origin. */
  wsBaseUrl?: string;
}

export function createDevClient(cfg: DevClientConfig): BrokerClient {
  let cached: string | null = null;
  const token = async () => (cached ??= await cfg.getToken());

  return {
    async fetch(path, options = {}) {
      const t = await token();
      const headers = new Headers(options.headers);
      if (t) headers.set('Authorization', `Bearer ${t}`);
      return fetch((cfg.baseUrl ?? '') + path, { ...options, headers });
    },
    async connectWebSocket() {
      const t = await token();
      if (!t) throw new Error('connectWebSocket requires an auth token');
      const origin = cfg.wsBaseUrl || (cfg.baseUrl ?? '') || window.location.origin;
      const url = origin.replace(/^http/, 'ws') + '/api/flow/user-ws?token=' + encodeURIComponent(t);
      return new WebSocket(url);
    },
  };
}
