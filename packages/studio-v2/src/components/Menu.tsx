import { useEffect, useRef, useState, type ReactNode } from 'react';

export interface MenuItem {
  key: string;
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  danger?: boolean;
  separatorBefore?: boolean;
  disabled?: boolean;
}

interface Props {
  items: MenuItem[];
  className?: string;   // classe du bouton déclencheur
  title?: string;
  ariaLabel?: string;
  children: ReactNode;  // contenu du déclencheur (ex : <IconDots/>)
  align?: 'left' | 'right';
}

// Popover léger et réutilisable (toolbar preview + « ⋯ » des sessions). Ancré au
// déclencheur via position: fixed calculée à l'ouverture → jamais clippé par un
// conteneur scrollable. Se ferme au clic dehors ou sur Échap. Pas d'overlay plein
// écran (contrairement à .sv-modal) : c'est une liste rapide, pas une tâche.
export function Menu({ items, className, title, ariaLabel, children, align = 'right' }: Props) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left?: number; right?: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (btnRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    // Le popover est en position: fixed (ancré au bouton) → on le ferme dès qu'un
    // scroll ou un resize le désolidariserait du déclencheur. Scroll en capture
    // pour attraper aussi le défilement d'un conteneur interne (liste sidebar).
    const onMove = () => setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', onMove);
    window.addEventListener('scroll', onMove, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onMove);
      window.removeEventListener('scroll', onMove, true);
    };
  }, [open]);

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos(align === 'right'
        ? { top: r.bottom + 6, right: Math.max(8, window.innerWidth - r.right) }
        : { top: r.bottom + 6, left: r.left });
    }
    setOpen((o) => !o);
  };

  return (
    <>
      <button ref={btnRef} className={className} title={title} aria-label={ariaLabel} aria-haspopup="menu" aria-expanded={open} onClick={toggle}>
        {children}
      </button>
      {open && pos && (
        <div
          ref={menuRef}
          className="sv-menu"
          role="menu"
          style={{ position: 'fixed', top: pos.top, left: pos.left, right: pos.right, zIndex: 1200 }}
          onClick={(e) => e.stopPropagation()}
        >
          {items.map((it) => (
            <div key={it.key}>
              {it.separatorBefore && <div className="sv-menu__sep" />}
              <button
                role="menuitem"
                className={'sv-menu__item' + (it.danger ? ' sv-menu__item--danger' : '')}
                disabled={it.disabled}
                onClick={() => { setOpen(false); it.onClick(); }}
              >
                {it.icon && <span className="sv-menu__ico">{it.icon}</span>}
                <span className="sv-menu__lbl">{it.label}</span>
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
