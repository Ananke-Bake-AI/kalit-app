// Icônes SVG monochromes (jamais d'emoji). currentColor pour hériter la teinte.
import type { SVGProps } from 'react';

const base = (p: SVGProps<SVGSVGElement>) => ({
  width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none',
  stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const, ...p,
});

export const IconLogo = (p: SVGProps<SVGSVGElement>) => (
  <svg width={22} height={22} viewBox="0 0 24 24" fill="none" {...p}>
    <rect width={24} height={24} rx={6} fill="#101318" />
    <path d="M8 5v14M8 12l7-7M8 12l7 7" stroke="url(#svg)" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    <defs><linearGradient id="svg" x1="8" y1="5" x2="15" y2="19" gradientUnits="userSpaceOnUse"><stop stopColor="#4C8DFF" /><stop offset="1" stopColor="#6AA0FF" /></linearGradient></defs>
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
