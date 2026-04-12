"use client"

import { useState, useEffect, useCallback } from "react"
import { brokerFetch } from "@/lib/broker-direct"
import { Icon } from "@/components/icon"
import { useI18n } from "@/stores/i18n"
import s from "./file-explorer.module.scss"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FileNode {
  name: string
  path: string
  isDir: boolean
  size?: number
  children?: FileNode[]
  url?: string
}

interface ProjectStatus {
  status?: string
  phase?: string
  stats?: { total: number; done: number; inProgress: number; todo: number }
  activeAgents?: number
  deployUrl?: string
  projectType?: string
}

interface FileExplorerProps {
  sessionId: string | null
  onPreviewFile?: (file: { url: string; name: string }) => void
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const IMAGE_EXTS = new Set(["png", "jpg", "jpeg", "gif", "webp", "svg", "ico", "bmp"])
const CODE_COLORS: Record<string, string> = {
  html: "#e34c26", css: "#264de4", js: "#f7df1e", ts: "#3178c6", tsx: "#3178c6",
  jsx: "#61dafb", json: "#a8a8a8", py: "#3776ab", go: "#00add8", md: "#ffffff",
  svg: "#ffb13b", sh: "#4eaa25",
}

function ext(name: string) {
  const d = name.lastIndexOf(".")
  return d >= 0 ? name.slice(d + 1).toLowerCase() : ""
}
function isImg(name: string) { return IMAGE_EXTS.has(ext(name)) }
function fmtSize(b: number) {
  if (!b || b < 1024) return ""
  if (b < 1048576) return (b / 1024).toFixed(0) + "K"
  return (b / 1048576).toFixed(1) + "M"
}
function countFiles(nodes: FileNode[]): number {
  let c = 0
  for (const n of nodes) {
    if (n.isDir && n.children) c += countFiles(n.children)
    else if (!n.isDir) c++
  }
  return c
}

const PHASE_CONFIG_KEYS: Record<string, { color: string; key: string; pulse?: boolean }> = {
  idle: { color: "var(--text-secondary)", key: "studio.phaseIdle" },
  preparation: { color: "var(--color-5)", key: "studio.phasePreparing", pulse: true },
  planning: { color: "var(--color-2)", key: "studio.phasePlanning", pulse: true },
  running: { color: "var(--color-2)", key: "studio.phaseGenerating", pulse: true },
  developing: { color: "var(--color-2)", key: "studio.phaseDeveloping", pulse: true },
  testing: { color: "var(--color-3)", key: "studio.phaseTesting", pulse: true },
  deploying: { color: "var(--color-2)", key: "studio.phaseDeploying", pulse: true },
  done: { color: "var(--success)", key: "studio.phaseCompleted" },
  error: { color: "var(--danger)", key: "studio.phaseFailed" },
  cancelled: { color: "var(--text-secondary)", key: "studio.phaseCancelled" },
}

// ---------------------------------------------------------------------------
// Tree node
// ---------------------------------------------------------------------------

function TreeNode({ node, depth, expanded, onToggle, onDelete, onPreview }: {
  node: FileNode
  depth: number
  expanded: Set<string>
  onToggle: (p: string) => void
  onDelete: (p: string) => void
  onPreview?: (f: { url: string; name: string }) => void
}) {
  const { t } = useI18n()
  const open = expanded.has(node.path)
  const pad = 8 + depth * 14

  if (node.isDir) {
    return (
      <div>
        <div className={s.folderRow} style={{ paddingLeft: pad }} onClick={() => onToggle(node.path)}>
          <Icon icon="hugeicons:arrow-right-01" className={open ? s.chevronOpen : s.chevron} />
          <Icon icon={open ? "hugeicons:folder-open" : "hugeicons:folder-01"} className={s.folderIcon} />
          <span className={s.folderName}>{node.name}</span>
          <span className={s.folderCount}>{node.children?.filter((c) => !c.isDir).length ?? 0}</span>
        </div>
        {open && node.children?.map((c, idx) => (
          <TreeNode key={`${c.path}-${idx}`} node={c} depth={depth + 1} expanded={expanded} onToggle={onToggle} onDelete={onDelete} onPreview={onPreview} />
        ))}
      </div>
    )
  }

  const e = ext(node.name)
  const color = CODE_COLORS[e] || "var(--text-secondary)"

  return (
    <div className={s.treeItem} style={{ paddingLeft: pad + 12 }} title={node.name}>
      {isImg(node.name) && node.url ? (
        <img
          src={node.url}
          alt=""
          className={s.fileThumb}
          onError={(ev) => { (ev.target as HTMLImageElement).style.display = "none" }}
          onClick={(ev) => { ev.stopPropagation(); onPreview?.({ url: node.url!, name: node.name }) }}
        />
      ) : (
        <span className={s.fileExtBadge} style={{ backgroundColor: color + "22", color }}>
          {e ? e.slice(0, 3) : "?"}
        </span>
      )}
      <span className={s.fileName}>{node.name}</span>
      <span className={s.fileSize}>{fmtSize(node.size ?? 0)}</span>
      <button className={s.deleteBtn} onClick={(ev) => { ev.stopPropagation(); onDelete(node.path) }} title={t("studio.delete")}>
        <Icon icon="hugeicons:cancel-01" />
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Project status section
// ---------------------------------------------------------------------------

function ProjectSection({ project, flowProjectId }: { project: ProjectStatus; flowProjectId?: string }) {
  const { t } = useI18n()
  const phase = project.phase || project.status || "idle"
  const cfg = PHASE_CONFIG_KEYS[phase] || PHASE_CONFIG_KEYS[project.status || ""] || PHASE_CONFIG_KEYS.idle
  const stats = project.stats
  const progress = stats && stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0

  return (
    <div className={s.projectSection}>
      <div className={s.statusRow}>
        <span
          className={s.statusIndicator}
          style={{ background: cfg.color, animation: cfg.pulse ? "pulse 1.5s ease-in-out infinite" : "none" }}
        />
        <span className={s.statusLabel}>{t(cfg.key)}</span>
        {project.activeAgents != null && project.activeAgents > 0 && (
          <span style={{ marginLeft: "auto", fontSize: "0.62rem", color: "var(--text-secondary)" }}>
            {project.activeAgents} {project.activeAgents > 1 ? t("studio.agents") : t("studio.agent")}
          </span>
        )}
      </div>

      {stats && stats.total > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div className={s.progressTrack}>
            <div className={s.progressFill} style={{ width: `${progress}%` }} />
          </div>
          <div className={s.progressMeta}>
            <span>{stats.done}/{stats.total} {t("studio.tasks")}</span>
            <span>{progress}%</span>
          </div>
        </div>
      )}

      <div className={s.actionRow}>
        {flowProjectId && (
          <a href={`/studio/project/${flowProjectId}`} className={s.actionLink}>
            <Icon icon="hugeicons:link-square-02" />
            {t("studio.project")}
          </a>
        )}
        {project.deployUrl && (
          <a href={project.deployUrl} target="_blank" rel="noopener noreferrer" className={s.actionLink}>
            <Icon icon="hugeicons:globe-02" />
            {t("studio.liveSite")}
          </a>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function FileExplorer({ sessionId, onPreviewFile }: FileExplorerProps) {
  const { t } = useI18n()
  const [tree, setTree] = useState<FileNode[]>([])
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["assets", "references", "project"]))
  const [loading, setLoading] = useState(false)
  const [taskforceId, setTaskforceId] = useState<string | null>(null)
  const [flowProjectId, setFlowProjectId] = useState<string | null>(null)
  const [project, setProject] = useState<ProjectStatus | null>(null)
  const [tab, setTab] = useState<"files" | "info">("files")

  const fetchTree = useCallback(async () => {
    if (!sessionId) return
    try {
      const tfRes = await brokerFetch(`/api/broker/workspace-tree/${sessionId}`)
      if (tfRes.ok) {
        const d = await tfRes.json()
        setTaskforceId(d.projectId || null)
        setFlowProjectId(d.flowProjectId || null)
        if (d.project) {
          setProject({
            status: d.project.status, phase: d.project.phase,
            stats: d.project.stats, activeAgents: d.project.activeAgents,
            projectType: d.project.projectType,
          })
        } else if (d.projectId) {
          setProject({ status: "preparation", phase: "preparation" })
        }
        const tfTree = d.tree ?? []
        if (tfTree.length > 0) {
          const convert = (nodes: { name: string; path: string; type: string; size?: number; children?: unknown[] }[]): FileNode[] =>
            nodes.map((n) => ({
              name: n.name, path: n.path, isDir: n.type === "directory", size: n.size,
              children: n.children ? convert(n.children as typeof nodes) : undefined,
              url: n.type !== "directory" && sessionId ? `/api/broker/files/${sessionId}/${n.path}` : undefined,
            }))
          setTree(convert(tfTree))
          setLoading(false)
          return
        }
      }
      // Fallback: session files
      const res = await brokerFetch(`/api/broker/session-files/${sessionId}`)
      if (res.ok) { setTree((await res.json()).tree ?? []) }
    } catch { /* silent */ }
    finally { setLoading(false) }
  }, [sessionId])

  useEffect(() => {
    if (!sessionId) return
    setLoading(true); setProject(null); setTaskforceId(null); setFlowProjectId(null)
    fetchTree()
    const iv = setInterval(fetchTree, 5000)
    return () => clearInterval(iv)
  }, [sessionId, fetchTree])

  const toggle = useCallback((p: string) => {
    setExpanded((prev) => { const n = new Set(prev); n.has(p) ? n.delete(p) : n.add(p); return n })
  }, [])

  const deleteFile = useCallback(async (path: string) => {
    if (!sessionId) return
    try {
      if (taskforceId) {
        const [cat, ...rest] = path.split("/")
        const fname = rest.join("/")
        if (cat && fname) {
          await brokerFetch(
            `/api/broker/workspace-delete/${sessionId}?category=${encodeURIComponent(cat)}&path=${encodeURIComponent(fname)}`,
            { method: "DELETE" },
          ).catch(() => {})
        }
      }
      fetchTree()
    } catch { /* silent */ }
  }, [sessionId, taskforceId, fetchTree])

  if (!sessionId) return null

  const total = countFiles(tree)

  return (
    <div className={s.panel}>
      {/* Header */}
      <div className={s.header}>
        <Icon icon="hugeicons:source-code" style={{ color: "var(--color-2)", fontSize: "0.85rem" }} />
        <span className={s.headerTitle}>{t("studio.project")}</span>
        {taskforceId && <span className={s.liveBadge}>{t("studio.live")}</span>}
      </div>

      {/* Project status */}
      {project && <ProjectSection project={project} flowProjectId={flowProjectId ?? undefined} />}

      {/* Tabs */}
      <div className={s.tabs}>
        <button className={tab === "files" ? s.tabActive : s.tab} onClick={() => setTab("files")}>
          {t("studio.files")} {total > 0 && <span className={s.tabCount}>({total})</span>}
        </button>
        <button className={tab === "info" ? s.tabActive : s.tab} onClick={() => setTab("info")}>
          {t("studio.info")}
        </button>
      </div>

      {/* Content */}
      <div className={s.content}>
        {tab === "files" && (
          <div style={{ padding: "4px 0" }}>
            {loading && tree.length === 0 ? (
              <div className={s.empty}>
                <span className={s.emptyTitle}>{t("studio.loading")}</span>
              </div>
            ) : tree.length === 0 ? (
              <div className={s.empty}>
                <Icon icon="hugeicons:file-02" />
                <span className={s.emptyTitle}>{t("studio.noFilesYet")}</span>
                <span className={s.emptySub}>{t("studio.uploadOrStart")}</span>
              </div>
            ) : (
              tree.map((node) => (
                <TreeNode
                  key={node.path}
                  node={node}
                  depth={0}
                  expanded={expanded}
                  onToggle={toggle}
                  onDelete={deleteFile}
                  onPreview={onPreviewFile}
                />
              ))
            )}
          </div>
        )}

        {tab === "info" && (
          <div className={s.infoSection}>
            {taskforceId ? (
              <>
                <div>
                  <div className={s.infoLabel}>{t("studio.taskforceId")}</div>
                  <div className={s.infoValue}>{taskforceId}</div>
                </div>
                {flowProjectId && (
                  <div>
                    <div className={s.infoLabel}>{t("studio.flowProject")}</div>
                    <div className={s.infoValue}>{flowProjectId}</div>
                  </div>
                )}
                {project?.status && (
                  <div>
                    <div className={s.infoLabel}>{t("studio.status")}</div>
                    <div style={{ fontSize: "0.7rem", color: "var(--text)" }}>{project.phase || project.status}</div>
                  </div>
                )}
                {project?.stats && (
                  <div>
                    <div className={s.infoLabel}>{t("studio.tasks")}</div>
                    <div className={s.infoGrid}>
                      <div className={s.infoCell}><span className={s.infoCellValue} style={{ color: "var(--success)" }}>{project.stats.done}</span><span className={s.infoCellLabel}>{t("studio.done")}</span></div>
                      <div className={s.infoCell}><span className={s.infoCellValue} style={{ color: "var(--color-2)" }}>{project.stats.inProgress}</span><span className={s.infoCellLabel}>{t("studio.active")}</span></div>
                      <div className={s.infoCell}><span className={s.infoCellValue}>{project.stats.todo}</span><span className={s.infoCellLabel}>{t("studio.todo")}</span></div>
                      <div className={s.infoCell}><span className={s.infoCellValue}>{project.stats.total}</span><span className={s.infoCellLabel}>{t("studio.total")}</span></div>
                    </div>
                  </div>
                )}
                <div>
                  <div className={s.infoLabel}>{t("studio.files")}</div>
                  <div style={{ fontSize: "0.7rem", color: "var(--text)" }}>{total} {total !== 1 ? t("studio.files") : t("studio.file")}</div>
                </div>
              </>
            ) : (
              <div className={s.empty}>
                <span className={s.emptyTitle}>{t("studio.noProjectLinked")}</span>
                <span className={s.emptySub}>{t("studio.uploadOrStartProject")}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
