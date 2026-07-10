import type { FileNode, PreviewMode } from '../lib/types';
import { IconCode, IconExpand, IconEye, IconFolder, IconFile, IconRefresh } from '../lib/icons';
import { useStrings } from '../lib/i18n';

interface Props {
  mode: PreviewMode;
  onMode: (m: PreviewMode) => void;
  previewUrl: string | null;
  tree: FileNode[];
  publishUrl: string | null;
  publishing: boolean;
  canPublish: boolean;
  onPublish: () => void;
  onRefresh: () => void;
  onOpen: () => void;
  building?: boolean;
  hasMessages?: boolean;
  onSuggest?: (prompt: string) => void;
}

function fmt(b?: number) {
  if (!b) return '';
  if (b > 1e6) return (b / 1e6).toFixed(1) + ' Mo';
  if (b > 1e3) return Math.round(b / 1e3) + ' Ko';
  return b + ' o';
}

function Tree({ nodes, depth = 0 }: { nodes: FileNode[]; depth?: number }) {
  return (
    <>
      {nodes.map((n) => (
        <div key={n.path}>
          <div className="sv-tree__row" style={{ paddingLeft: 4 + depth * 14 }}>
            {n.dir ? <IconFolder className="sv-tree__dir" width={14} height={14} /> : <IconFile className="sv-tree__file" width={14} height={14} />}
            <span className={n.dir ? 'sv-tree__dir' : 'sv-tree__file'}>{n.name}{n.dir ? '/' : ''}{n.collapsed ? ' …' : ''}</span>
            {!n.dir && <span className="sv-tree__sz">{fmt(n.size)}</span>}
          </div>
          {n.children && !n.collapsed && <Tree nodes={n.children} depth={depth + 1} />}
        </div>
      ))}
    </>
  );
}

/** État du panneau quand il n'y a pas encore d'aperçu à montrer. */
function PreviewEmpty({ building, hasMessages, onSuggest }: { building?: boolean; hasMessages?: boolean; onSuggest?: (p: string) => void }) {
  const t = useStrings();

  // L'agent travaille (ou a commencé) mais aucun fichier servable encore.
  if (building || hasMessages) {
    return (
      <div className="sv-prev__state">
        <div className="sv-prev__spinner" aria-hidden />
        <div className="sv-prev__state-title">{t.building}</div>
        <div className="sv-prev__state-sub">{t.buildingSub}</div>
      </div>
    );
  }

  // Nouvelle session : propositions de départ (sans encombrer le chat).
  return (
    <div className="sv-prev__welcome">
      <div className="sv-prev__welcome-h">
        <div className="sv-prev__state-title">{t.suggestTitle}</div>
        <div className="sv-prev__state-sub">{t.suggestSub}</div>
      </div>
      <div className="sv-prev__sugs">
        {t.suggestions.map((s) => (
          <button key={s} type="button" className="sv-sug" onClick={() => onSuggest?.(s)}>
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Preview({ mode, onMode, previewUrl, tree, publishUrl, publishing, canPublish, onPublish, onRefresh, onOpen, building, hasMessages, onSuggest }: Props) {
  const t = useStrings();
  return (
    <section className="sv-prev">
      <div className="sv-prev__bar">
        <span className={'sv-tab' + (mode === 'preview' ? ' sv-tab--on' : '')} onClick={() => onMode('preview')}><IconEye width={14} height={14} style={{ verticalAlign: '-2px', marginRight: 5 }} />{t.preview}</span>
        <span className={'sv-tab' + (mode === 'files' ? ' sv-tab--on' : '')} onClick={() => onMode('files')}><IconCode width={14} height={14} style={{ verticalAlign: '-2px', marginRight: 5 }} />{t.files}</span>
        <div className="sv-prev__bar-r">
          {publishUrl
            ? <a className="sv-btn sv-btn--ghost" href={publishUrl} target="_blank" rel="noreferrer" title={t.onlineSite}><span className="sv-dot sv-dot--idle" /> {t.online}</a>
            : canPublish && <button className="sv-btn sv-btn--primary" disabled={publishing} onClick={onPublish}>{publishing ? t.publishing : t.publish}</button>}
          <button className="sv-btn sv-btn--ghost sv-btn--icon" title={t.refresh} onClick={onRefresh}><IconRefresh /></button>
          <button className="sv-btn sv-btn--ghost sv-btn--icon" title={t.openTab} onClick={onOpen}><IconExpand /></button>
        </div>
      </div>
      {mode === 'preview' ? (
        previewUrl
          ? <div className="sv-prev__body"><iframe className="sv-prev__frame" src={previewUrl} title="preview" /></div>
          : <PreviewEmpty building={building} hasMessages={hasMessages} onSuggest={onSuggest} />
      ) : (
        tree.length ? <div className="sv-tree"><Tree nodes={tree} /></div> : <div className="sv-empty">{t.noFiles}</div>
      )}
    </section>
  );
}
