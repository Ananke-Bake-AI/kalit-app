import type { ReactNode } from 'react';

// Rendu markdown léger et sûr pour le chat (pas de HTML brut → React échappe
// tout). Couvre ce que l'agent produit : gras, italique, code inline + blocs,
// liens explicites et URLs nues, titres, listes, citations.

const INLINE_RE = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*\n]+\*|_[^_\n]+_)|(\[[^\]]+\]\([^)\s]+\))|((?:https?:\/\/|www\.)[^\s<>()]+)/g;

function inline(text: string, kp = ''): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  INLINE_RE.lastIndex = 0;
  while ((m = INLINE_RE.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const tok = m[0];
    const key = kp + 'i' + i++;
    if (m[1]) out.push(<code key={key} className="sv-md-code">{tok.slice(1, -1)}</code>);
    else if (m[2]) out.push(<strong key={key}>{inline(tok.slice(2, -2), key)}</strong>);
    else if (m[3]) out.push(<em key={key}>{inline(tok.slice(1, -1), key)}</em>);
    else if (m[4]) {
      const mm = /\[([^\]]+)\]\(([^)\s]+)\)/.exec(tok)!;
      out.push(<a key={key} href={mm[2]} target="_blank" rel="noreferrer">{mm[1]}</a>);
    } else if (m[5]) {
      const url = tok.startsWith('www.') ? 'https://' + tok : tok;
      out.push(<a key={key} href={url} target="_blank" rel="noreferrer">{tok}</a>);
    }
    last = m.index + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

const BLOCK_START = /^(```|#{1,6}\s|\s*([-*+]|\d+\.)\s|>\s?)/;

export function Md({ text }: { text: string }): ReactNode {
  const lines = (text || '').replace(/\r/g, '').split('\n');
  const blocks: ReactNode[] = [];
  let i = 0;
  let k = 0;
  while (i < lines.length) {
    const line = lines[i];

    if (/^```/.test(line)) {
      const buf: string[] = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) buf.push(lines[i++]);
      i++; // fence fermante
      blocks.push(<pre key={k++} className="sv-md-pre"><code>{buf.join('\n')}</code></pre>);
      continue;
    }

    const h = /^(#{1,6})\s+(.*)$/.exec(line);
    if (h) {
      blocks.push(<div key={k++} className={'sv-md-h sv-md-h' + h[1].length}>{inline(h[2])}</div>);
      i++;
      continue;
    }

    if (/^\s*([-*+]|\d+\.)\s+/.test(line)) {
      const ordered = /^\s*\d+\./.test(line);
      const items: string[] = [];
      while (i < lines.length && /^\s*([-*+]|\d+\.)\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*([-*+]|\d+\.)\s+/, ''));
        i++;
      }
      const children = items.map((it, j) => <li key={j}>{inline(it, 'l' + k + j)}</li>);
      blocks.push(ordered
        ? <ol key={k++} className="sv-md-list">{children}</ol>
        : <ul key={k++} className="sv-md-list">{children}</ul>);
      continue;
    }

    if (/^>\s?/.test(line)) {
      const buf: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) buf.push(lines[i++].replace(/^>\s?/, ''));
      blocks.push(<blockquote key={k++} className="sv-md-quote">{inline(buf.join('\n'), 'q' + k)}</blockquote>);
      continue;
    }

    if (line.trim() === '') { i++; continue; }

    const buf: string[] = [];
    while (i < lines.length && lines[i].trim() !== '' && !BLOCK_START.test(lines[i])) buf.push(lines[i++]);
    blocks.push(<p key={k++} className="sv-md-p">{inline(buf.join('\n'), 'p' + k)}</p>);
  }
  return <>{blocks}</>;
}
