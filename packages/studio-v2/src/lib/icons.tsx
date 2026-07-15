// Icônes SVG monochromes (jamais d'emoji). currentColor pour hériter la teinte.
import type { SVGProps } from 'react';

const base = (p: SVGProps<SVGSVGElement>) => ({
  width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none',
  stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const, ...p,
});

// Vrai logo Kalit (même path que @kalit/studio-ui), tracé en bleu accent.
export const IconLogo = (p: SVGProps<SVGSVGElement>) => (
  <svg width={22} height={22} viewBox="0 0 82 82" fill="none" style={{ overflow: 'visible' }} {...p}>
    <path
      d="M71.8779 81.977C71.8779 64.9236 58.0534 51.0991 41 51.0991C23.9466 51.0991 10.1221 64.9236 10.1221 81.977V0.0436401M71.8779 0.0646362C71.8779 17.118 58.0534 30.9426 41 30.9426"
      stroke="var(--sv-accent, #4c8dff)"
      strokeWidth={21}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
export const IconPlus = (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)}><path d="M12 5v14M5 12h14" /></svg>);
export const IconSearch = (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)}><circle cx={11} cy={11} r={7} /><path d="m20 20-3.2-3.2" /></svg>);
export const IconSend = (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)}><path d="M6 12h13M13 6l6 6-6 6" /></svg>);
export const IconStop = (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)}><rect x={7} y={7} width={10} height={10} rx={2} /></svg>);
export const IconCode = (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)}><path d="m8 8-4 4 4 4M16 8l4 4-4 4M13 5l-2 14" /></svg>);
export const IconEye = (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" /><circle cx={12} cy={12} r={3} /></svg>);
export const IconFolder = (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)}><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" /></svg>);
export const IconFile = (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)}><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z" /><path d="M14 3v5h5" /></svg>);
export const IconRefresh = (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)}><path d="M21 12a9 9 0 1 1-2.6-6.4M21 4v5h-5" /></svg>);
export const IconExpand = (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)}><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" /></svg>);
export const IconAttach = (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)}><path d="M21 11.5 12 20a5 5 0 0 1-7-7l9-9a3.5 3.5 0 0 1 5 5l-9 9a2 2 0 0 1-3-3l8.5-8.5" /></svg>);
export const IconDots = (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)}><circle cx={12} cy={5} r={1.4} /><circle cx={12} cy={12} r={1.4} /><circle cx={12} cy={19} r={1.4} /></svg>);
export const IconTrash = (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)}><path d="M4 7h16M10 11v6M14 11v6M5 7l1 13a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-13M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3" /></svg>);
export const IconClose = (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)}><path d="M6 6l12 12M18 6 6 18" /></svg>);
export const IconDownload = (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)}><path d="M12 3v12M7 10l5 5 5-5M5 21h14" /></svg>);
export const IconUsers = (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)}><circle cx={9} cy={8} r={3.2} /><path d="M3.5 20a5.5 5.5 0 0 1 11 0M16 5.2a3.2 3.2 0 0 1 0 6.1M18 20a5.5 5.5 0 0 0-3.2-5" /></svg>);
export const IconEdit = (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)}><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>);
export const IconGlobe = (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)}><circle cx={12} cy={12} r={9} /><path d="M3 12h18M12 3c2.5 2.6 3.8 5.7 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.7-3.8-9S9.5 5.6 12 3Z" /></svg>);
