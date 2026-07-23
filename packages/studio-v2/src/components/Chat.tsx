import { useEffect, useMemo, useRef, useState, type DragEvent } from 'react';
import type { Activity, Message, Segment } from '../lib/types';
import { IconAttach, IconSend, IconStop, IconClose } from '../lib/icons';
import { ModelSelector } from './ModelSelector';
import { labelFor } from '../lib/models';
import { useStrings } from '../lib/i18n';
import { Md } from '../lib/markdown';
import { type PromptLevel } from '../lib/promptQuality';
import { pushDataLayer } from '../lib/analytics';

// Immersive/focus toggle: hides the global Kalit header + banners so the studio
// fills the whole viewport. The focus state lives in the landing's
// StudioFocusProvider (another package), so we drive it through a window-event
// bridge: fire `kalit:studio-focus-toggle`, and mirror the icon from the
// `kalit:studio-focus-state` events it broadcasts back (+ localStorage on load).
function FullscreenBtn({ label }: { label: string }) {
  const [focus, setFocus] = useState(false);
  useEffect(() => {
    try { setFocus(window.localStorage.getItem('studio-focus-mode') === '1'); } catch { /* ignore */ }
    const on = (e: Event) => setFocus(!!(e as CustomEvent).detail);
    window.addEventListener('kalit:studio-focus-state', on);
    return () => window.removeEventListener('kalit:studio-focus-state', on);
  }, []);
  const toggle = () => window.dispatchEvent(new Event('kalit:studio-focus-toggle'));
  return (
    <button className="sv-btn sv-btn--ghost sv-iconbtn" onClick={toggle} title={label} aria-label={label}>
      {focus
        ? <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" /></svg>
        : <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" /></svg>}
    </button>
  );
}

interface Props {
  title: string;
  messages: Message[];
  streaming: boolean;
  activity: Activity | null;
  model: string;
  modelGroups?: import('../lib/models').ModelGroup[];
  onModelChange: (id: string) => void;
  onSend: (text: string) => void;
  onStop: () => void;
  onChoiceAnswer: (text: string) => void;
  ctxPercent?: number | null;
  attachments?: { id: string; name: string }[];
  uploading?: boolean;
  onAddFiles?: (files: File[]) => void;
  onRemoveAttachment?: (id: string) => void;
  outOfCredits?: boolean;
  pricingHref?: string;
  checkPromptQuality?: (text: string) => Promise<'none' | 'enrich' | 'rich' | null>;
  isAdmin?: boolean;
  precision?: boolean;
  onPrecisionChange?: (on: boolean) => void;
  onShare?: (action: 'share' | 'unshare') => Promise<{ shared: boolean; shareId?: string } | null>;
  canShare?: boolean;
  queued?: string[];
  onQueuePrompt?: (text: string) => void;
  onCancelQueued?: (i: number) => void;
  meId?: string; // id de l'utilisateur courant → attribution des messages partagés
}

function ChoiceView({ s, onAnswer }: { s: Extract<Segment, { kind: 'choice' }>; onAnswer: (t: string) => void }) {
  const st = useStrings();
  const [sel, setSel] = useState<string[]>([]);
  if (s.answered) {
    return (
      <div className="sv-choice sv-choice--locked">
        <div className="sv-choice__q">{s.question}</div>
        <div className="sv-choice__opts">{s.options.map((o) => <span key={o.label} className="sv-choice__pill">{o.label}</span>)}</div>
      </div>
    );
  }
  const toggle = (label: string) => {
    if (!s.multiSelect) { onAnswer(label); return; }
    setSel((p) => p.includes(label) ? p.filter((x) => x !== label) : [...p, label]);
  };
  return (
    <div className="sv-choice">
      <div className="sv-choice__q">{s.question}</div>
      <div className="sv-choice__opts">
        {s.options.map((o) => (
          <button key={o.label} className={'sv-choice__opt' + (sel.includes(o.label) ? ' sv-choice__opt--on' : '')} onClick={() => toggle(o.label)}>
            <span className="sv-choice__label">{o.label}</span>
            {o.description && <span className="sv-choice__desc">{o.description}</span>}
          </button>
        ))}
      </div>
      {s.multiSelect && <button className="sv-btn sv-btn--primary" disabled={!sel.length} onClick={() => onAnswer(sel.join(', '))}>{st.validate}</button>}
      {s.freeform && <div className="sv-choice__free">{st.answerFreely}</div>}
    </div>
  );
}

// Durée d'un tour : "8s" / "2m14s" (jamais de sous-seconde, peu utile ici).
function fmtDuration(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m${String(s % 60).padStart(2, '0')}s`;
}
// Tokens : 850 / 45.2k / 1.20M.
function fmtTokens(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1e6) return `${(n / 1000).toFixed(1)}k`;
  return `${(n / 1e6).toFixed(2)}M`;
}
// Token kalit (crédits facturés) : nombre lisible, 2 décimales max sans zéros inutiles.
function fmtCredits(n: number): string {
  if (n >= 1000) return fmtTokens(Math.round(n));
  return Number(n.toFixed(2)).toString();
}

// Pied de tour cliquable → modal avec le détail (token kalit + vrais tokens).
function StatsFooter({ s }: { s: Extract<Segment, { kind: 'stats' }> }) {
  const t = useStrings().stats;
  const [open, setOpen] = useState(false);
  // Modèles gateway : seul l'input est remonté (sortie/cache à 0) → on masque le
  // détail par type (trompeur : « 0 » ≠ « pas de sortie ») et on met une note.
  const hasBreakdown = s.outputTokens > 0 || s.cacheReadTokens > 0 || s.cacheCreationTokens > 0;
  return (
    <>
      <button type="button" className="sv-stats" onClick={() => setOpen(true)} title={t.details}>
        <span className="sv-stats__i">⏱ {fmtDuration(s.durationMs)}</span>
        <span className="sv-stats__i">◆ {fmtCredits(s.credits)} {t.unit}</span>
      </button>
      {open && (
        <div className="sv-modal" onClick={() => setOpen(false)}>
          <div className="sv-modal__panel" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <h3 className="sv-modal__title">{t.title}</h3>
            <div className="sv-stats__grid">
              <div className="sv-stats__row"><span>{t.credits}</span><b>{fmtCredits(s.credits)}</b></div>
              <div className="sv-stats__row"><span>{t.duration}</span><b>{fmtDuration(s.durationMs)}</b></div>
              <div className="sv-stats__sep" />
              <div className="sv-stats__row"><span>{t.realTotal}</span><b>{fmtTokens(s.tokens)}</b></div>
              {hasBreakdown ? (
                <>
                  <div className="sv-stats__row sv-stats__sub"><span>{t.input}</span><span>{fmtTokens(s.inputTokens)}</span></div>
                  <div className="sv-stats__row sv-stats__sub"><span>{t.output}</span><span>{fmtTokens(s.outputTokens)}</span></div>
                  <div className="sv-stats__row sv-stats__sub"><span>{t.cacheRead}</span><span>{fmtTokens(s.cacheReadTokens)}</span></div>
                  <div className="sv-stats__row sv-stats__sub"><span>{t.cacheWrite}</span><span>{fmtTokens(s.cacheCreationTokens)}</span></div>
                </>
              ) : (
                <div className="sv-stats__note">{t.gateway}</div>
              )}
            </div>
            <div className="sv-modal__row"><button className="sv-btn sv-btn--primary" onClick={() => setOpen(false)}>{t.close}</button></div>
          </div>
        </div>
      )}
    </>
  );
}

// Modal de partage public : consentement → crée le lien → copie + révocation.
function ShareModal({ onShare, onClose }: { onShare: (action: 'share' | 'unshare') => Promise<{ shared: boolean; shareId?: string } | null>; onClose: () => void }) {
  const st = useStrings().share;
  const [url, setUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const create = async () => {
    setBusy(true);
    const r = await onShare('share');
    setBusy(false);
    if (r?.shareId) {
      const link = `${window.location.origin}/share/${r.shareId}`;
      setUrl(link);
      try { await navigator.clipboard.writeText(link); setCopied(true); } catch { /* ignore */ }
    }
  };
  const copy = async () => { if (!url) return; try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* ignore */ } };
  const unshare = async () => { setBusy(true); await onShare('unshare'); setBusy(false); onClose(); };
  return (
    <div className="sv-modal" onClick={onClose}>
      <div className="sv-modal__panel" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <button className="sv-modal__x" onClick={onClose} aria-label={st.close}><IconClose /></button>
        <h3 className="sv-modal__title">{st.title}</h3>
        {!url ? (
          <>
            <p className="sv-modal__sub">{st.consent}</p>
            <div className="sv-modal__row">
              <button className="sv-btn sv-btn--primary" disabled={busy} onClick={create}>{busy && <span className="sv-btn__spin" />}{st.create}</button>
              <button className="sv-btn sv-btn--ghost" onClick={onClose}>{st.close}</button>
            </div>
          </>
        ) : (
          <>
            <p className="sv-modal__sub">{copied ? st.copied : st.anyone}</p>
            <div className="sv-share__link">
              <input className="sv-domain__input" readOnly value={url} onFocus={(e) => e.currentTarget.select()} />
              <button className="sv-btn sv-btn--primary" onClick={copy}>{copied ? st.copiedBtn : st.copy}</button>
            </div>
            <div className="sv-modal__row">
              <a className="sv-btn sv-btn--ghost" href={url} target="_blank" rel="noreferrer">{st.open}</a>
              <button className="sv-btn sv-btn--ghost" disabled={busy} onClick={unshare}>{st.stop}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function SegmentView({ s, onChoiceAnswer, onToolClick }: { s: Segment; onChoiceAnswer: (t: string) => void; onToolClick?: (s: Extract<Segment, { kind: 'tool' }>) => void }) {
  const st = useStrings();
  if (s.kind === 'text') return <div className="sv-msg__text sv-md"><Md text={s.content} /></div>;
  if (s.kind === 'thinking') return (
    <div className="sv-think"><div className="sv-think__l">{st.thinking}</div><div className="sv-think__t">{s.content}</div></div>
  );
  // Refinement du prompt (enrichissement système) — accordéon FERMÉ par défaut.
  if (s.kind === 'refinement') return (
    <details className="sv-refine">
      <summary className="sv-refine__sum">✨ {st.refinement}</summary>
      <div className="sv-refine__body sv-md"><Md text={s.content} /></div>
    </details>
  );
  // Clic sur un usage d'outil → modal avec les détails complets du tool call.
  if (s.kind === 'tool') return (
    <button type="button" className="sv-tool sv-tool--btn" title={st.toolDetails} onClick={() => onToolClick?.(s)}>
      ⚙ {s.name}{s.input ? <span className="sv-tool__arg">{s.input}</span> : null}{s.done ? ' ·' : '…'}
    </button>
  );
  if (s.kind === 'file') return <div className="sv-tool">↓ {s.name}</div>;
  if (s.kind === 'error') return <div className="sv-err">{s.content}</div>;
  if (s.kind === 'choice') return <ChoiceView s={s} onAnswer={onChoiceAnswer} />;
  // Pied de tour cliquable : token kalit + durée, clic → détail.
  if (s.kind === 'stats') return <StatsFooter s={s} />;
  return null;
}

export function Chat({ title, messages, streaming, activity, model, modelGroups, onModelChange, onSend, onStop, onChoiceAnswer, ctxPercent, attachments = [], uploading, onAddFiles, onRemoveAttachment, outOfCredits, pricingHref, checkPromptQuality, isAdmin, precision, onPrecisionChange, onShare, canShare, queued = [], onQueuePrompt, onCancelQueued, meId }: Props) {
  const st = useStrings();
  const [val, setVal] = useState('');

  // Carte "généré avec le modèle gratuit" : attribue la qualité du résultat au
  // modèle (pas à Kalit) au moment exact où l'utilisateur la juge, avec un CTA
  // upgrade. Uniquement pour un compte free (tous les modèles payants locked)
  // ayant généré avec un modèle free. Jamais pendant le stream, jamais empilée
  // sur la bannière crédits, refermable 7 jours.
  const UPSELL_HIDE_KEY = 'sv-free-upsell-until';
  const [upsellHidden, setUpsellHidden] = useState(true);
  useEffect(() => {
    try { setUpsellHidden(Date.now() < Number(localStorage.getItem(UPSELL_HIDE_KEY) || 0)); }
    catch { setUpsellHidden(false); }
  }, []);
  const dismissUpsell = () => {
    setUpsellHidden(true);
    try { localStorage.setItem(UPSELL_HIDE_KEY, String(Date.now() + 7 * 24 * 3600 * 1000)); } catch { /* ignore */ }
  };
  const allModels = useMemo(() => (modelGroups ?? []).flatMap((g) => g.models), [modelGroups]);
  const onFreeTier = useMemo(() => {
    const paid = allModels.filter((m) => (m.minTier || 'free') !== 'free');
    return paid.length > 0 && paid.every((m) => m.locked === true);
  }, [allModels]);
  const currentIsFree = (allModels.find((m) => m.id === model)?.minTier || 'free') === 'free';
  const hasResult = messages.some((m) => m.role === 'assistant');
  const showFreeUpsell = onFreeTier && currentIsFree && hasResult && !streaming && !outOfCredits && !upsellHidden;
  // Historique des prompts envoyés (terminal-style ↑/↓), persisté pour ne pas
  // les perdre au reload. histPos = -1 → brouillon courant ; 0..n → navigation.
  const HIST_KEY = 'sv-prompt-history';
  const histRef = useRef<string[]>([]);
  const histPosRef = useRef(-1);
  const draftRef = useRef('');
  const taRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { try { const h = JSON.parse(localStorage.getItem(HIST_KEY) || '[]'); if (Array.isArray(h)) histRef.current = h; } catch { /* ignore */ } }, []);
  const caretToEnd = () => requestAnimationFrame(() => { const el = taRef.current; if (el) { el.selectionStart = el.selectionEnd = el.value.length; } });
  // Halo de qualité du prompt (indicateur live du détecteur de sous-spécif).
  // Activable, défaut ON — persistance localStorage.
  const [haloOn, setHaloOn] = useState(true);
  useEffect(() => { try { setHaloOn(localStorage.getItem('sv-prompt-halo') !== '0'); } catch { /* ignore */ } }, []);
  const toggleHalo = () => setHaloOn((v) => { const n = !v; try { localStorage.setItem('sv-prompt-halo', n ? '1' : '0'); } catch { /* ignore */ } return n; });
  // Halo piloté UNIQUEMENT par le modèle CPU du broker (classifieur lexical
  // in-process, ~µs), appelé en debounce 500ms pendant la frappe. Rien tant que
  // le modèle n'a pas répondu (le halo apparaît ~500ms après la pause de frappe).
  const [modelLevel, setModelLevel] = useState<PromptLevel | null>(null);
  useEffect(() => {
    if (!haloOn || !checkPromptQuality) { setModelLevel(null); return; }
    const t = val.trim();
    if (!t) { setModelLevel('none'); return; }
    let alive = true;
    const id = setTimeout(async () => {
      const lv = await checkPromptQuality(t);
      if (!alive || lv == null) return;
      setModelLevel(lv === 'enrich' ? 'low' : lv === 'rich' ? 'high' : 'none');
    }, 500);
    return () => { alive = false; clearTimeout(id); };
  }, [val, haloOn, checkPromptQuality]);
  const level: PromptLevel = haloOn ? (modelLevel ?? 'none') : 'none';
  // Le modèle sélectionné accepte-t-il les images ? (flag catalogue admin-toggleable,
  // remonté via modelGroups). Fail-open : inconnu/ancien catalogue ⇒ on autorise, pour
  // ne jamais bloquer à tort. Sert à griser le bouton pièce-jointe (garde UX en amont ;
  // le worker + la gateway strip couvrent déjà le crash côté backend).
  const modelSupportsImages =
    (modelGroups ?? []).flatMap((g) => g.models).find((x) => x.id === model)?.vision !== false;
  const feedRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [, force] = useState(0);
  // Modal des détails d'un tool call (clic sur un badge d'outil).
  const [toolModal, setToolModal] = useState<{ name: string; input: string } | null>(null);
  const [shareOpen, setShareOpen] = useState(false);

  const pickFiles = (fl: FileList | null) => { if (fl && fl.length && onAddFiles) onAddFiles(Array.from(fl)); };
  const onDrop = (e: DragEvent<HTMLElement>) => { e.preventDefault(); setDragging(false); pickFiles(e.dataTransfer.files); };

  useEffect(() => { feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight }); }, [messages, activity]);
  // heartbeat pour le temps écoulé de l'indicateur d'activité
  useEffect(() => { if (!activity) return; const t = setInterval(() => force((n) => n + 1), 1000); return () => clearInterval(t); }, [activity]);

  const send = () => {
    const t = val.trim();
    if (!t && !attachments.length) return;
    // Tour en cours → on EMPILE le prompt (file d'attente) au lieu de bloquer.
    // Il partira automatiquement à la fin du tour courant. (v1 : texte uniquement ;
    // les pièces jointes ne s'empilent pas.)
    if (streaming) {
      if (t && onQueuePrompt) { onQueuePrompt(t); setVal(''); }
      return;
    }
    if (t) {
      const h = histRef.current;
      if (h[0] !== t) { h.unshift(t); if (h.length > 20) h.length = 20; try { localStorage.setItem(HIST_KEY, JSON.stringify(h)); } catch { /* ignore */ } }
    }
    histPosRef.current = -1; draftRef.current = '';
    onSend(t); setVal('');
  };
  const elapsed = activity ? Math.floor((Date.now() - activity.since) / 1000) : 0;

  return (
    <section className="sv-chat"
      onDragOver={(e) => { if (onAddFiles) { e.preventDefault(); setDragging(true); } }}
      onDragLeave={(e) => { if (e.currentTarget === e.target) setDragging(false); }}
      onDrop={onDrop}
    >
      {dragging && <div className="sv-drop"><div className="sv-drop__in">{st.dropHere}</div></div>}
      <div className="sv-chat__bar">
        <span className="sv-chat__title">{title}</span>
        <div className="sv-chat__bar-r">
          {typeof ctxPercent === 'number' && (
            <span className="sv-chip" title={st.ctxUsed}>ctx {ctxPercent}%</span>
          )}
          {onShare && canShare && (
            <button className="sv-btn sv-btn--ghost sv-chat__share" onClick={() => setShareOpen(true)} title={st.share.button}>
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 15V3m0 0L8 7m4-4 4 4" /><path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7" /></svg>
              {st.share.button}
            </button>
          )}
          <ModelSelector value={model} onChange={onModelChange} isAdmin={isAdmin} groups={modelGroups} pricingHref={pricingHref} />
          {onPrecisionChange && (
            <button
              className={'sv-btn sv-btn--ghost sv-chat__precision' + (precision ? ' sv-chat__precision--on' : '')}
              onClick={() => onPrecisionChange(!precision)}
              title={st.precision.hint}
              aria-pressed={!!precision}
            >
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3.5" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" strokeLinecap="round" /></svg>
              {st.precision.label}
            </button>
          )}
          <FullscreenBtn label={st.fullscreen} />
        </div>
      </div>
      {shareOpen && onShare && <ShareModal onShare={onShare} onClose={() => setShareOpen(false)} />}

      <div className="sv-feed" ref={feedRef}>
        {messages.map((m) => {
          // Attribution collaborative : un message user d'un AUTRE membre (author
          // renseigné et ≠ moi) porte son nom/initiale ; sinon « You ».
          const other = m.role === 'user' && !!m.authorUserId && !!meId && m.authorUserId !== meId;
          const who = m.role !== 'user' ? 'Kalit' : other ? (m.authorName || st.collaborator) : st.you;
          const av = m.role !== 'user' ? 'K' : other ? (m.authorName || '?').trim().charAt(0).toUpperCase() || '·' : 'V';
          return (
          <div key={m.id} className={'sv-msg ' + (m.role === 'user' ? 'sv-msg--user' : 'sv-msg--asst') + (other ? ' sv-msg--other' : '')}>
            <div className="sv-msg__av">{av}</div>
            <div className="sv-msg__body">
              <div className="sv-msg__name">{who}</div>
              {m.segments.map((s, i) => <SegmentView key={i} s={s} onChoiceAnswer={onChoiceAnswer} onToolClick={(seg) => setToolModal({ name: seg.name, input: seg.inputFull || seg.input || st.noArgs })} />)}
            </div>
          </div>
          );
        })}
      </div>

      {activity && (
        <div className="sv-activity">
          <span className="sv-activity__dot" />{activity.label}
          {elapsed >= 2 && <span className="sv-activity__t">{elapsed}s</span>}
        </div>
      )}

      {outOfCredits && (
        <div className="sv-credits" role="alert">
          <span className="sv-credits__msg">{st.errors.credits}</span>
          <a className="sv-btn sv-btn--primary sv-credits__cta" href={pricingHref || '/pricing'} onClick={() => pushDataLayer('upgrade_clicked', { surface: 'studio', mode: 'out_of_credits' })}>{st.upgrade}</a>
        </div>
      )}

      {showFreeUpsell && (
        <div className="sv-upsell" role="note">
          <div className="sv-upsell__txt">
            <strong>{st.freeModel.title}</strong>
            <span>{st.freeModel.body.replace('{model}', labelFor(model))}</span>
          </div>
          <a className="sv-btn sv-btn--primary sv-upsell__cta" href={pricingHref || '/pricing'} target="_blank" rel="noreferrer" onClick={() => pushDataLayer('upgrade_clicked', { surface: 'studio', mode: 'free_model_result' })}>{st.upgrade}</a>
          <button className="sv-upsell__x" aria-label={st.del.cancel} onClick={dismissUpsell}><IconClose width={12} height={12} /></button>
        </div>
      )}

      <div className="sv-composer">
        {queued.length > 0 && (
          <div className="sv-queue" role="list" aria-label={st.queuedLabel}>
            <span className="sv-queue__hd">{st.queuedLabel.replace('{n}', String(queued.length))}</span>
            {queued.map((q, i) => (
              <span key={i} role="listitem" className="sv-queue__item" title={q}>
                <span className="sv-queue__n">{q}</span>
                <button className="sv-queue__x" aria-label={st.del.cancel} onClick={() => onCancelQueued?.(i)}><IconClose width={11} height={11} /></button>
              </span>
            ))}
          </div>
        )}
        <div className={'sv-composer__box' + (level !== 'none' ? ' sv-q--' + level : '')}>
          {(attachments.length > 0 || uploading) && (
            <div className="sv-atts">
              {attachments.map((a) => (
                <span key={a.id} className="sv-att" title={a.name}>
                  <IconAttach width={12} height={12} />
                  <span className="sv-att__n">{a.name}</span>
                  <button className="sv-att__x" onClick={() => onRemoveAttachment?.(a.id)} aria-label="remove">×</button>
                </span>
              ))}
              {uploading && <span className="sv-att sv-att--load"><span className="sv-btn__spin" /></span>}
            </div>
          )}
          <textarea
            ref={taRef}
            value={val} onChange={(e) => { setVal(e.target.value); histPosRef.current = -1; }}
            onKeyDown={(e) => {
              const ta = e.currentTarget;
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); return; }
              // ↑ = prompt précédent (seulement caret tout en haut → l'édition multi-ligne reste possible)
              if (e.key === 'ArrowUp' && ta.selectionStart === 0 && ta.selectionEnd === 0) {
                const h = histRef.current; if (!h.length) return;
                if (histPosRef.current === -1) draftRef.current = val;
                histPosRef.current = Math.min(histPosRef.current + 1, h.length - 1);
                setVal(h[histPosRef.current]); caretToEnd(); e.preventDefault(); return;
              }
              // ↓ = revenir vers le brouillon
              if (e.key === 'ArrowDown' && histPosRef.current >= 0) {
                const h = histRef.current; histPosRef.current -= 1;
                setVal(histPosRef.current < 0 ? draftRef.current : h[histPosRef.current]); caretToEnd(); e.preventDefault(); return;
              }
              // Ctrl/Cmd+Z sur composer vide → restaure le dernier prompt envoyé
              if ((e.key === 'z' || e.key === 'Z') && (e.ctrlKey || e.metaKey) && !e.shiftKey && !val.trim()) {
                const h = histRef.current; if (h.length) { setVal(h[0]); histPosRef.current = 0; draftRef.current = ''; caretToEnd(); e.preventDefault(); }
                return;
              }
            }}
            placeholder={st.composerPlaceholder} rows={1}
          />
          <div className="sv-composer__row">
            <button className="sv-btn sv-btn--ghost sv-btn--icon" title={modelSupportsImages ? st.attach : st.attachNoVision} onClick={() => fileRef.current?.click()} disabled={!onAddFiles || !modelSupportsImages}><IconAttach /></button>
            <input ref={fileRef} type="file" multiple style={{ display: 'none' }} onChange={(e) => { pickFiles(e.target.files); e.target.value = ''; }} />
            <button type="button" className={'sv-qtoggle' + (haloOn ? ' sv-qtoggle--on' : '')} onClick={toggleHalo} title={st.promptQuality + (haloOn && level !== 'none' ? ' — ' + st.promptLevels[level] : '')} aria-label={st.promptQuality}>
              <span className={'sv-qtoggle__dot' + (haloOn && level !== 'none' ? ' sv-q--' + level : '')} />
            </button>
            <div className="sv-composer__row-r">
              <span className="sv-kbd">⏎</span>
              {streaming
                ? <button className="sv-btn" onClick={onStop}><IconStop /> {st.stop}</button>
                : <button className="sv-btn sv-btn--primary" onClick={send} disabled={!val.trim() && !attachments.length}><IconSend /> {st.send}</button>}
            </div>
          </div>
        </div>
      </div>

      {toolModal && (
        <div className="sv-modal" role="dialog" aria-modal="true" onClick={() => setToolModal(null)}>
          <div className="sv-modal__panel sv-modal__panel--wide" onClick={(e) => e.stopPropagation()}>
            <button className="sv-modal__x" onClick={() => setToolModal(null)} aria-label="close">×</button>
            <h3 className="sv-modal__title">⚙ {toolModal.name}</h3>
            <pre className="sv-modal__pre">{toolModal.input}</pre>
          </div>
        </div>
      )}
    </section>
  );
}
