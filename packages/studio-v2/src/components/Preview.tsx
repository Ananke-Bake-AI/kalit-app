import type { FileNode, PreviewMode } from '../lib/types';
import { IconCode, IconExpand, IconEye, IconFolder, IconFile, IconRefresh } from '../lib/icons';

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

export function Preview({ mode, onMode, previewUrl, tree, publishUrl, publishing, canPublish, onPublish, onRefresh, onOpen }: Props) {
  return (
    <section className="sv-prev">
      <div className="sv-prev__bar">
        <span className={'sv-tab' + (mode === 'preview' ? ' sv-tab--on' : '')} onClick={() => onMode('preview')}><IconEye width={14} height={14} style={{ verticalAlign: '-2px', marginRight: 5 }} />Aperçu</span>
        <span className={'sv-tab' + (mode === 'files' ? ' sv-tab--on' : '')} onClick={() => onMode('files')}><IconCode width={14} height={14} style={{ verticalAlign: '-2px', marginRight: 5 }} />Fichiers</span>
        <div className="sv-prev__bar-r">
          {publishUrl
            ? <a className="sv-btn sv-btn--ghost" href={publishUrl} target="_blank" rel="noreferrer" title="Site en ligne"><span className="sv-dot sv-dot--idle" /> en ligne</a>
            : canPublish && <button className="sv-btn sv-btn--primary" disabled={publishing} onClick={onPublish}>{publishing ? 'Publication…' : 'Publier'}</button>}
          <button className="sv-btn sv-btn--ghost sv-btn--icon" title="Rafraîchir" onClick={onRefresh}><IconRefresh /></button>
          <button className="sv-btn sv-btn--ghost sv-btn--icon" title="Ouvrir dans un onglet" onClick={onOpen}><IconExpand /></button>
        </div>
      </div>
      {mode === 'preview' ? (
        previewUrl
          ? <div className="sv-prev__body"><iframe className="sv-prev__frame" src={previewUrl} title="preview" /></div>
          : <div className="sv-empty">L'aperçu apparaîtra ici<br />dès que l'agent aura écrit les premiers fichiers.</div>
      ) : (
        tree.length ? <div className="sv-tree"><Tree nodes={tree} /></div> : <div className="sv-empty">Aucun fichier pour l'instant.</div>
      )}
    </section>
  );
}
