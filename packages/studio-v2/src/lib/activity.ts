// Dérive un « feed d'activité live » depuis les segments tool déjà reçus pendant
// un tour (Write/Edit/Bash/browser/find-assets…). 100% front, aucune donnée
// backend nouvelle : on parse l'`input` (≤200 car, éventuellement tronqué) des
// tool_use et on joint la taille des fichiers depuis l'arbre workspace (déjà pollé).

import type { Segment } from './types';

export type ActivityKind =
  | 'think' | 'write' | 'edit' | 'read' | 'bash' | 'search'
  | 'navigate' | 'screenshot' | 'resize' | 'console' | 'assets' | 'task' | 'tool';

export interface ActivityStep {
  key: string;
  kind: ActivityKind;
  target?: string;   // fichier / URL / commande / requête
  detail?: string;   // « 2,3 ko », « 14 images »…
  status: 'running' | 'done' | 'error';
}

// Extraction robuste d'un champ string d'un JSON possiblement tronqué à 200 car.
function field(input: string, key: string): string | undefined {
  const m = input.match(new RegExp('"' + key + '"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"'));
  if (!m) return undefined;
  try { return JSON.parse('"' + m[1] + '"'); } catch { return m[1]; }
}
function numField(input: string, key: string): string | undefined {
  const m = input.match(new RegExp('"' + key + '"\\s*:\\s*(\\d+)'));
  return m ? m[1] : undefined;
}
function basename(p: string): string { return p.split('/').filter(Boolean).pop() || p; }

export function fmtSize(bytes?: number): string | undefined {
  if (!bytes || bytes <= 0) return undefined;
  if (bytes >= 1e6) return (bytes / 1e6).toFixed(1).replace('.', ',') + ' Mo';
  if (bytes >= 1e3) return Math.round(bytes / 1e3) + ' ko';
  return bytes + ' o';
}

// Un seul segment tool → une étape d'activité (ou null si à ignorer).
function stepFromTool(
  s: Extract<Segment, { kind: 'tool' }>,
  idx: number,
  sizeOf: (path: string) => number | undefined,
): ActivityStep | null {
  const name = s.name || '';
  const input = s.input || '';
  const status: ActivityStep['status'] = s.isError ? 'error' : s.done ? 'done' : 'running';
  const key = 'a' + idx;
  const low = name.toLowerCase();

  if (name === 'Write') {
    const fp = field(input, 'file_path') || field(input, 'filePath');
    return { key, kind: 'write', target: fp ? basename(fp) : undefined, detail: fp ? fmtSize(sizeOf(fp)) : undefined, status };
  }
  if (name === 'Edit' || name === 'MultiEdit') {
    const fp = field(input, 'file_path');
    return { key, kind: 'edit', target: fp ? basename(fp) : undefined, status };
  }
  if (name === 'Read') {
    const fp = field(input, 'file_path');
    return { key, kind: 'read', target: fp ? basename(fp) : undefined, status };
  }
  if (name === 'Bash') {
    const cmd = field(input, 'command');
    return { key, kind: 'bash', target: cmd ? cmd.slice(0, 60) : undefined, status };
  }
  if (name === 'Glob' || name === 'Grep') {
    const pat = field(input, 'pattern');
    return { key, kind: 'search', target: pat, status };
  }
  if (low.includes('browser_navigate')) {
    return { key, kind: 'navigate', target: field(input, 'url'), status };
  }
  if (low.includes('browser_take_screenshot') || low.includes('screenshot')) {
    return { key, kind: 'screenshot', status };
  }
  if (low.includes('browser_resize')) {
    const w = numField(input, 'width');
    return { key, kind: 'resize', target: w ? w + 'px' : undefined, status };
  }
  if (low.includes('browser_console')) {
    return { key, kind: 'console', status };
  }
  if (low.includes('find-assets') || low.includes('find_assets')) {
    // requête = prompt ; nb d'images = premier nombre du résultat s'il existe.
    const q = field(input, 'prompt');
    let detail: string | undefined;
    if (s.result) { const n = s.result.match(/(\d+)\s*(image|asset|résultat|result)/i); if (n) detail = n[1] + ' images'; }
    return { key, kind: 'assets', target: q ? q.slice(0, 48) : undefined, detail, status };
  }
  if (name === 'Task') {
    const sub = field(input, 'subagent_type');
    return { key, kind: 'task', target: sub, status };
  }
  // Outils non pertinents pour le suivi visuel : on les masque (TodoWrite, etc.)
  if (name === 'TodoWrite' || low.includes('killshell') || low.includes('bashoutput')) return null;
  return { key, kind: 'tool', target: name, status };
}

// Construit le feed depuis les segments live + un accès à la taille des fichiers.
// thinkingActive : y a-t-il du thinking en cours (pour la ligne « réfléchit… »).
export function deriveActivity(
  segments: Segment[],
  sizeOf: (path: string) => number | undefined,
  thinkingActive: boolean,
): ActivityStep[] {
  const steps: ActivityStep[] = [];
  let toolIdx = 0;
  for (const seg of segments) {
    if (seg.kind === 'tool') {
      const st = stepFromTool(seg, toolIdx++, sizeOf);
      if (st) steps.push(st);
    }
  }
  if (thinkingActive && steps.every((s) => s.status !== 'running')) {
    steps.push({ key: 'think', kind: 'think', status: 'running' });
  }
  return steps;
}

// Le tour a-t-il écrit/édité au moins un fichier ? (déclencheur de l'état « build »
// vs « conversation »). On regarde les segments tool.
export function hasFileActivity(segments: Segment[]): boolean {
  return segments.some((s) => s.kind === 'tool' && (s.name === 'Write' || s.name === 'Edit' || s.name === 'MultiEdit'));
}

// Aplatit l'arbre workspace en une map path → size pour le join des tailles.
export function flattenSizes(tree: { path: string; size?: number; children?: unknown[] }[]): Map<string, number> {
  const out = new Map<string, number>();
  const walk = (nodes: { path: string; size?: number; children?: unknown[] }[]) => {
    for (const n of nodes) {
      if (typeof n.size === 'number') out.set(n.path, n.size);
      if (Array.isArray(n.children)) walk(n.children as typeof nodes);
    }
  };
  walk(tree);
  return out;
}
