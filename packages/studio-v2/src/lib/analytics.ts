// Analytics bridge — même contrat que packages/studio-ui/src/lib/analytics.ts.
//
// Le studio v2 est le cœur du produit : ses événements d'activation
// (prompt_submitted, generation_*, publish_*) alimentent l'optimisation des
// campagnes X/Meta/Google. Hôte landing → `window.__kalitTrack` (fan-out
// unifié GTM/X + GA4 + Meta + X Pixel, cf. apps/landing/lib/analytics/
// data-layer.ts). Hôte sans bridge → dataLayer seul. Shell desktop/mobile →
// no-op.

interface AnalyticsWindow {
  dataLayer?: Record<string, unknown>[];
  __kalitTrack?: (event: string, params?: Record<string, unknown>) => void;
}

export function pushDataLayer(event: string, params: Record<string, unknown> = {}): void {
  if (typeof window === 'undefined') return;
  const w = window as AnalyticsWindow;

  if (typeof w.__kalitTrack === 'function') {
    w.__kalitTrack(event, params);
    return;
  }

  w.dataLayer = w.dataLayer || [];
  w.dataLayer.push({ event, ...params });
}
