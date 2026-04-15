"use client"

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react"
import clsx from "clsx"
import { Icon } from "@/components/icon"
import { useI18n } from "@/stores/i18n"
import { brokerFetch } from "@/lib/broker-direct"
import { useStudioStore, type ImportedRepoState } from "@/stores/studio"
import s from "./import-repo-modal.module.scss"

interface ImportRepoModalProps {
  sessionId: string | null
  onClose: () => void
  onEnsureSession?: () => Promise<string | null>
}

interface Installation {
  id: string
  installationId: string
  accountLogin: string
  accountType: string
}

interface Repo {
  id: number
  name: string
  fullName: string
  owner: string
  private: boolean
  defaultBranch: string
  description: string | null
}

type Tab = "github" | "manual"

export function ImportRepoModal({ sessionId, onClose, onEnsureSession }: ImportRepoModalProps) {
  const { t } = useI18n()
  const setImportedRepo = useStudioStore((st) => st.setImportedRepo)
  const addMessage = useStudioStore((st) => st.addMessage)
  const existing = useStudioStore((st) => st.importedRepo)

  const [tab, setTab] = useState<Tab>("github")
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // Pushes a local "repo linked" notice into the chat so the user knows what
  // to do next. `temp-` prefix makes the store's merge dedup carry it across
  // server-side refreshes (it has no server counterpart, so it's kept).
  const pushRepoLinkedNotice = useCallback((repoName: string) => {
    const content = t("studio.repoLinkedChat").replace("{repo}", repoName)
    addMessage({
      id: `temp-repolinked-${Date.now()}`,
      role: "assistant",
      content,
      createdAt: new Date().toISOString(),
    })
  }, [addMessage, t])

  const handleAttached = useCallback((r: ImportedRepoState) => {
    setImportedRepo(r)
    pushRepoLinkedNotice(repoDisplayName(r.url))
    onClose()
  }, [setImportedRepo, pushRepoLinkedNotice, onClose])

  // Escape to close
  useEffect(() => {
    const handler = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [onClose])

  const attached = !!existing

  return (
    <div className={s.overlay} onClick={onClose}>
      <div className={s.modal} onClick={(e) => e.stopPropagation()}>
        <div className={s.header}>
          <div className={s.headerText}>
            <div className={s.title}>{t("studio.importRepoTitle")}</div>
            <div className={s.subtitle}>{t("studio.importRepoSubtitle")}</div>
          </div>
          <button className={s.closeBtn} onClick={onClose} aria-label={t("studio.close")}>
            <Icon icon="hugeicons:cancel-01" />
          </button>
        </div>

        <div className={s.tabs}>
          <button
            className={clsx(s.tab, tab === "github" && s.tabActive)}
            onClick={() => { setTab("github"); setError(null) }}
          >
            <Icon icon="hugeicons:github-01" />
            {t("studio.importRepoTabGithub")}
          </button>
          <button
            className={clsx(s.tab, tab === "manual" && s.tabActive)}
            onClick={() => { setTab("manual"); setError(null) }}
          >
            <Icon icon="hugeicons:link-04" />
            {t("studio.importRepoTabManual")}
          </button>
        </div>

        {tab === "github" ? (
          <GitHubTab
            sessionId={sessionId}
            onEnsureSession={onEnsureSession}
            setError={setError}
            setBusy={setBusy}
            busy={busy}
            onAttached={handleAttached}
          />
        ) : (
          <ManualTab
            sessionId={sessionId}
            onEnsureSession={onEnsureSession}
            setError={setError}
            setBusy={setBusy}
            busy={busy}
            existing={existing}
            onAttached={handleAttached}
          />
        )}

        {error && <div className={s.error}>{error}</div>}

        <div className={s.footer}>
          {attached && (
            <DetachButton
              sessionId={sessionId}
              busy={busy}
              setBusy={setBusy}
              setError={setError}
              onDetached={() => { setImportedRepo(null); onClose() }}
            />
          )}
          <div className={s.spacer} />
          <button
            className={`${s.btn} ${s.btnSecondary}`}
            onClick={onClose}
            disabled={busy}
          >
            {t("studio.cancel")}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── GitHub tab ────────────────────────────────────────────────

interface TabProps {
  sessionId: string | null
  onEnsureSession?: () => Promise<string | null>
  setError: (s: string | null) => void
  setBusy: (b: boolean) => void
  busy: boolean
  onAttached: (r: ImportedRepoState) => void
}

function GitHubTab({ sessionId, onEnsureSession, setError, setBusy, busy, onAttached }: TabProps) {
  const { t } = useI18n()
  const [configured, setConfigured] = useState<boolean | null>(null)
  const [installations, setInstallations] = useState<Installation[]>([])
  const [selectedInstall, setSelectedInstall] = useState<string | null>(null)
  const [repos, setRepos] = useState<Repo[]>([])
  const [reposLoading, setReposLoading] = useState(false)
  const [selectedRepo, setSelectedRepo] = useState<Repo | null>(null)
  const [branch, setBranch] = useState("")
  const [connecting, setConnecting] = useState(false)
  const [unlinkingId, setUnlinkingId] = useState<string | null>(null)
  const popupRef = useRef<Window | null>(null)

  const loadInstallations = useCallback(async () => {
    try {
      const res = await fetch("/api/github/installations")
      const data = (await res.json()) as {
        configured: boolean
        installations: Installation[]
      }
      setConfigured(data.configured)
      setInstallations(data.installations || [])
      if ((data.installations || []).length > 0) {
        setSelectedInstall((prev) => prev ?? data.installations[0].installationId)
      }
    } catch {
      setConfigured(true)
      setInstallations([])
      setError(t("studio.importRepoGhFailed"))
    }
  }, [setError, t])

  useEffect(() => { void loadInstallations() }, [loadInstallations])

  const loadRepos = useCallback(async (installationId: string) => {
    setReposLoading(true)
    setRepos([])
    setSelectedRepo(null)
    try {
      const res = await fetch(`/api/github/repos?installationId=${encodeURIComponent(installationId)}`)
      const data = (await res.json()) as { repos?: Repo[]; error?: string }
      if (!res.ok) {
        setError(data.error || t("studio.importRepoGhFailed"))
        return
      }
      setRepos(data.repos || [])
    } catch {
      setError(t("studio.importRepoGhFailed"))
    } finally {
      setReposLoading(false)
    }
  }, [setError, t])

  useEffect(() => {
    if (selectedInstall) void loadRepos(selectedInstall)
  }, [selectedInstall, loadRepos])

  const handleUnlink = useCallback(async (inst: Installation) => {
    if (unlinkingId) return
    const ok = typeof window !== "undefined"
      ? window.confirm(t("studio.importRepoGhUnlinkConfirm").replace("{account}", inst.accountLogin))
      : true
    if (!ok) return
    setUnlinkingId(inst.installationId)
    setError(null)
    try {
      const res = await fetch(`/api/github/installations/${encodeURIComponent(inst.installationId)}`, {
        method: "DELETE",
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        setError(data.error || t("studio.importRepoGhUnlinkFailed"))
        return
      }
      // If we just removed the selected install, clear selection and repos so
      // `loadInstallations` → selectedInstall can re-seed from the new list.
      if (selectedInstall === inst.installationId) {
        setSelectedInstall(null)
        setRepos([])
        setSelectedRepo(null)
      }
      await loadInstallations()
    } catch {
      setError(t("studio.importRepoGhUnlinkFailed"))
    } finally {
      setUnlinkingId(null)
    }
  }, [unlinkingId, selectedInstall, loadInstallations, setError, t])

  // Listen for the callback popup to signal completion, then refresh.
  useEffect(() => {
    const listener = (ev: MessageEvent) => {
      if (ev.origin !== window.location.origin) return
      const data = ev.data as { type?: string; error?: string }
      if (data?.type === "kalit:github-installed") {
        setConnecting(false)
        void loadInstallations()
      } else if (data?.type === "kalit:github-install-error") {
        setConnecting(false)
        setError(data.error || t("studio.importRepoGhFailed"))
      }
    }
    window.addEventListener("message", listener)
    return () => window.removeEventListener("message", listener)
  }, [loadInstallations, setError, t])

  const openInstallPopup = useCallback(() => {
    setError(null)
    setConnecting(true)
    const w = 900, h = 720
    const left = window.screenX + (window.outerWidth - w) / 2
    const top = window.screenY + (window.outerHeight - h) / 2
    const p = window.open(
      "/api/auth/github-app/install",
      "kalit-github-install",
      `popup=1,width=${w},height=${h},left=${left},top=${top}`,
    )
    if (!p) {
      setConnecting(false)
      setError(t("studio.importRepoGhPopupBlocked"))
      return
    }
    popupRef.current = p
    // If the user closes the popup without finishing, clear the connecting spinner.
    const watcher = setInterval(() => {
      if (p.closed) {
        clearInterval(watcher)
        setConnecting(false)
      }
    }, 500)
  }, [setError, t])

  const handleAttach = useCallback(async () => {
    if (!selectedInstall || !selectedRepo) return
    setError(null)
    setBusy(true)
    try {
      let sid = sessionId
      if (!sid && onEnsureSession) sid = await onEnsureSession()
      if (!sid) {
        setError(t("studio.connectionError"))
        return
      }
      const res = await fetch("/api/github/attach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: sid,
          installationId: selectedInstall,
          owner: selectedRepo.owner,
          repo: selectedRepo.name,
          branch: branch.trim() || undefined,
        }),
      })
      const data = (await res.json().catch(() => ({}))) as {
        error?: string
        url?: string
        username?: string
        branch?: string | null
        hasToken?: boolean
      }
      if (!res.ok) {
        setError(data.error || t("studio.importRepoFailed"))
        return
      }
      onAttached({
        url: data.url || `https://github.com/${selectedRepo.fullName}.git`,
        username: data.username || null,
        branch: data.branch ?? (branch.trim() || null),
        hasToken: !!data.hasToken,
      })
    } catch {
      setError(t("studio.importRepoFailed"))
    } finally {
      setBusy(false)
    }
  }, [selectedInstall, selectedRepo, sessionId, onEnsureSession, branch, setError, setBusy, onAttached, t])

  if (configured === null) {
    return (
      <div className={s.emptyState}>
        <Icon icon="hugeicons:loading-03" className={s.spin} />
        <span>{t("studio.importRepoGhLoading")}</span>
      </div>
    )
  }

  if (!configured) {
    return (
      <div className={s.notice}>
        <Icon icon="hugeicons:alert-circle" />
        <span>{t("studio.importRepoGhNotConfigured")}</span>
      </div>
    )
  }

  if (installations.length === 0) {
    return (
      <div className={s.connectPanel}>
        <div className={s.connectIcon}>
          <Icon icon="hugeicons:github-01" />
        </div>
        <div className={s.connectDesc}>{t("studio.importRepoGhConnectDesc")}</div>
        <button
          className={`${s.btn} ${s.btnPrimary}`}
          onClick={openInstallPopup}
          disabled={connecting}
        >
          {connecting ? t("studio.importRepoGhConnecting") : t("studio.importRepoGhConnect")}
        </button>
      </div>
    )
  }

  return (
    <div className={s.ghBody}>
      <div className={s.field}>
        <label className={s.label}>{t("studio.importRepoGhPickInstall")}</label>
        <div className={s.installRow}>
          {installations.map((inst) => {
            const active = selectedInstall === inst.installationId
            const isUnlinking = unlinkingId === inst.installationId
            return (
              <div
                key={inst.installationId}
                className={clsx(s.installChip, active && s.installChipActive)}
              >
                <button
                  type="button"
                  className={s.installChipLabel}
                  onClick={() => setSelectedInstall(inst.installationId)}
                  disabled={isUnlinking}
                >
                  <Icon icon={inst.accountType === "Organization" ? "hugeicons:building-06" : "hugeicons:user"} />
                  {inst.accountLogin}
                </button>
                <button
                  type="button"
                  className={s.installChipRemove}
                  onClick={() => handleUnlink(inst)}
                  disabled={!!unlinkingId}
                  title={t("studio.importRepoGhUnlink")}
                  aria-label={t("studio.importRepoGhUnlink")}
                >
                  <Icon
                    icon={isUnlinking ? "hugeicons:loading-03" : "hugeicons:cancel-01"}
                    className={isUnlinking ? s.spin : undefined}
                  />
                </button>
              </div>
            )
          })}
        </div>
      </div>

      <div className={s.field}>
        <label className={s.label}>{t("studio.importRepoGhPickRepo")}</label>
        {reposLoading ? (
          <div className={s.emptyState}>
            <Icon icon="hugeicons:loading-03" className={s.spin} />
            <span>{t("studio.importRepoGhLoading")}</span>
          </div>
        ) : repos.length === 0 ? (
          <div className={s.notice}>
            <Icon icon="hugeicons:alert-circle" />
            <span>{t("studio.importRepoGhNoRepos")}</span>
          </div>
        ) : (
          <div className={s.repoList}>
            {repos.map((r) => (
              <button
                key={r.id}
                className={clsx(s.repoItem, selectedRepo?.id === r.id && s.repoItemActive)}
                onClick={() => {
                  setSelectedRepo(r)
                  if (!branch) setBranch(r.defaultBranch)
                }}
              >
                <Icon icon={r.private ? "hugeicons:lock" : "hugeicons:unlocked-03"} />
                <div className={s.repoBody}>
                  <div className={s.repoName}>{r.fullName}</div>
                  {r.description && <div className={s.repoDesc}>{r.description}</div>}
                </div>
                <span className={s.repoBranchBadge}>#{r.defaultBranch}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className={s.field}>
        <label className={s.label} htmlFor="gh-branch">
          {t("studio.importRepoGhBranchLabel")}
        </label>
        <input
          id="gh-branch"
          className={s.input}
          type="text"
          placeholder={selectedRepo?.defaultBranch || "main"}
          value={branch}
          onChange={(e) => setBranch(e.target.value)}
          disabled={busy}
        />
      </div>

      <div className={s.ghFooter}>
        <button className={s.linkBtn} onClick={openInstallPopup} disabled={connecting}>
          <Icon icon="hugeicons:add-01" />
          {t("studio.importRepoGhReauthorize")}
        </button>
        <button
          className={`${s.btn} ${s.btnPrimary}`}
          onClick={handleAttach}
          disabled={busy || !selectedRepo}
        >
          {busy ? t("studio.importRepoAttaching") : t("studio.importRepoAttach")}
        </button>
      </div>
    </div>
  )
}

// ─── Manual tab ────────────────────────────────────────────────

interface ManualTabProps extends TabProps {
  existing: ImportedRepoState | null
}

function ManualTab({ sessionId, onEnsureSession, setError, setBusy, busy, onAttached, existing }: ManualTabProps) {
  const { t } = useI18n()
  const [url, setUrl] = useState(existing?.url ?? "")
  const [username, setUsername] = useState(existing?.username ?? "")
  const [token, setToken] = useState("")
  const [branch, setBranch] = useState(existing?.branch ?? "")
  const urlRef = useRef<HTMLInputElement>(null)

  useEffect(() => { urlRef.current?.focus() }, [])

  const handleAttach = useCallback(async () => {
    setError(null)
    const trimmedUrl = url.trim()
    if (!trimmedUrl) {
      setError(t("studio.importRepoUrlRequired"))
      return
    }
    setBusy(true)
    try {
      let sid = sessionId
      if (!sid && onEnsureSession) sid = await onEnsureSession()
      if (!sid) {
        setError(t("studio.connectionError"))
        return
      }
      const res = await brokerFetch(`/api/broker/sessions/${sid}/attach-repo`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: trimmedUrl,
          username: username.trim(),
          token: token.trim(),
          branch: branch.trim(),
        }),
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string; url?: string }
      if (!res.ok) {
        setError(data?.error || t("studio.importRepoFailed"))
        return
      }
      onAttached({
        url: data?.url || trimmedUrl,
        username: username.trim() || null,
        branch: branch.trim() || null,
        hasToken: token.trim().length > 0,
      })
    } catch {
      setError(t("studio.importRepoFailed"))
    } finally {
      setBusy(false)
    }
  }, [url, username, token, branch, sessionId, onEnsureSession, setError, setBusy, onAttached, t])

  const canSubmit = useMemo(() => url.trim().length > 0 && !busy, [url, busy])

  const onEnterSubmit = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && canSubmit) handleAttach()
  }

  return (
    <div className={s.form}>
      <div className={s.field}>
        <label className={s.label} htmlFor="import-repo-url">
          {t("studio.importRepoUrlLabel")}
        </label>
        <input
          ref={urlRef}
          id="import-repo-url"
          className={s.input}
          type="url"
          inputMode="url"
          autoComplete="off"
          spellCheck={false}
          placeholder="https://github.com/owner/repo"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={onEnterSubmit}
          disabled={busy}
        />
      </div>

      <div className={s.row}>
        <div className={s.field}>
          <label className={s.label} htmlFor="import-repo-username">
            {t("studio.importRepoUsernameLabel")}
          </label>
          <input
            id="import-repo-username"
            className={s.input}
            type="text"
            autoComplete="off"
            spellCheck={false}
            placeholder="git"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={onEnterSubmit}
            disabled={busy}
          />
        </div>
        <div className={s.field}>
          <label className={s.label} htmlFor="import-repo-branch">
            {t("studio.importRepoBranchLabel")}
          </label>
          <input
            id="import-repo-branch"
            className={s.input}
            type="text"
            autoComplete="off"
            spellCheck={false}
            placeholder="main"
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
            onKeyDown={onEnterSubmit}
            disabled={busy}
          />
        </div>
      </div>

      <div className={s.field}>
        <label className={s.label} htmlFor="import-repo-token">
          {t("studio.importRepoTokenLabel")}
        </label>
        <input
          id="import-repo-token"
          className={s.input}
          type="password"
          autoComplete="new-password"
          spellCheck={false}
          placeholder="ghp_..."
          value={token}
          onChange={(e) => setToken(e.target.value)}
          onKeyDown={onEnterSubmit}
          disabled={busy}
        />
      </div>

      <div className={s.notice}>
        <Icon icon="hugeicons:shield-01" />
        <span>{t("studio.importRepoTokenNotice")}</span>
      </div>

      <div className={s.manualFooter}>
        <button
          className={`${s.btn} ${s.btnPrimary}`}
          onClick={handleAttach}
          disabled={!canSubmit}
        >
          {busy ? t("studio.importRepoAttaching") : t("studio.importRepoAttach")}
        </button>
      </div>
    </div>
  )
}

// ─── Detach ────────────────────────────────────────────────────

interface DetachButtonProps {
  sessionId: string | null
  busy: boolean
  setBusy: (b: boolean) => void
  setError: (s: string | null) => void
  onDetached: () => void
}

function DetachButton({ sessionId, busy, setBusy, setError, onDetached }: DetachButtonProps) {
  const { t } = useI18n()
  const handleDetach = useCallback(async () => {
    if (!sessionId) {
      onDetached()
      return
    }
    setBusy(true)
    setError(null)
    try {
      const res = await brokerFetch(`/api/broker/sessions/${sessionId}/attach-repo`, {
        method: "DELETE",
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        setError(data?.error || t("studio.importRepoFailed"))
        return
      }
      onDetached()
    } catch {
      setError(t("studio.importRepoFailed"))
    } finally {
      setBusy(false)
    }
  }, [sessionId, setBusy, setError, onDetached, t])

  return (
    <button className={`${s.btn} ${s.btnDanger}`} onClick={handleDetach} disabled={busy}>
      {t("studio.importRepoDetach")}
    </button>
  )
}

// ─── Helpers ───────────────────────────────────────────────────

// Renders `owner/repo` when possible, falls back to hostname or the raw URL.
// Kept matcher-tolerant because the manual tab accepts any git URL.
function repoDisplayName(url: string): string {
  try {
    const u = new URL(url)
    const path = u.pathname.replace(/^\/+/, "").replace(/\.git$/, "")
    return path || u.host
  } catch {
    return url.replace(/\.git$/, "")
  }
}
