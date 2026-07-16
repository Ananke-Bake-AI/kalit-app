import { useEffect, useState } from 'react';
import { useStrings } from '../lib/i18n';
import { IconSun, IconMoon } from '../lib/icons';

// Bascule clair/sombre du studio. Auto-suffisant : reproduit EXACTEMENT le
// mécanisme du site (classe `.dark` sur <html> + localStorage 'dark-mode') pour
// rester synchro avec le toggle du header. Utile surtout en mobile où le header
// du site (et son toggle) n'est pas affiché dans le studio plein écran.
export function ThemeToggle() {
  const st = useStrings();
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains('dark'));
  }, []);

  const toggle = () => {
    const next = !document.documentElement.classList.contains('dark');
    document.documentElement.classList.toggle('dark', next);
    try { window.localStorage.setItem('dark-mode', next ? '1' : '0'); } catch { /* ignore */ }
    setDark(next);
  };

  return (
    <button type="button" className="sv-theme" onClick={toggle} title={st.theme.toggle} aria-label={st.theme.toggle}>
      {dark ? <IconSun width={16} height={16} /> : <IconMoon width={16} height={16} />}
      <span>{dark ? st.theme.light : st.theme.dark}</span>
    </button>
  );
}
