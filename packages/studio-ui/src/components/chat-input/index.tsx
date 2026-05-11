"use client"

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type DragEvent,
  type KeyboardEvent,
} from "react"
import { useStudioStore } from "../../store"
import { useI18n } from "@kalit/i18n/react"
import { brokerFetch } from "../../host"
import { Icon } from "../../primitives/icon"
import type { AtCommand, UploadedFile } from "../../types"
import clsx from "clsx"
import s from "./chat-input.module.scss"
import { ImportRepoModal } from "../import-repo-modal"

const AT_COMMAND_DEFS: { name: string; descKey: string; hint: string }[] = [
  { name: "find-assets", descKey: "studio.atFindAssets", hint: "chocolate icons 2d" },
  { name: "find-references", descKey: "studio.atFindRefs", hint: "modern SaaS website" },
  { name: "files", descKey: "studio.atFiles", hint: "" },
  { name: "grep", descKey: "studio.atGrep", hint: "className" },
  { name: "shell", descKey: "studio.atShell", hint: "npm run build" },
  { name: "status", descKey: "studio.atStatus", hint: "" },
  { name: "deploy", descKey: "studio.atDeploy", hint: "" },
]

interface ChatInputProps {
  onSend: (message: string, files?: UploadedFile[]) => void
  disabled?: boolean
  /**
   * When set, the textarea content is replaced with `text` and focused. The
   * `nonce` field forces re-application even when the same text is selected
   * twice in a row (e.g. clicking the same suggestion card again).
   */
  prefill?: { text: string; nonce: number } | null
  onEnsureSession?: () => Promise<string | null>
}

export function ChatInput({ onSend, disabled, prefill, onEnsureSession }: ChatInputProps) {
  const { t } = useI18n()
  const [input, setInput] = useState("")
  const [repoModalOpen, setRepoModalOpen] = useState(false)
  const {
    atMenu,
    setAtMenu,
    attachedFiles,
    setAttachedFiles,
    isUploading,
    setIsUploading,
    activeSessionId,
    isStreaming,
    importedRepo,
    quota,
  } = useStudioStore()

  // Org has run out of credits → block the input entirely and surface
  // the upgrade CTA inline. The broker also enforces this server-side
  // (HTTP 402) so circumventing the disabled state still gets refused;
  // this just spares a doomed round-trip and makes the dead-state
  // legible to the user instead of silently typing into a void.
  const outOfCredits =
    !!quota && typeof quota.remainingCredits === "number" && quota.remainingCredits <= 0
  // billingHref points at the landing's billing/upgrade page. Kept as a
  // constant so the i18n strings can use it without leaking it through
  // every callsite.
  const BILLING_HREF = "/settings/billing"

  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Apply prefill from welcome-screen suggestion cards. Cursor lands at the
  // end so the user can immediately continue the sentence.
  useEffect(() => {
    if (!prefill) return
    setInput(prefill.text)
    setAtMenu(null)
    requestAnimationFrame(() => {
      const el = inputRef.current
      if (!el) return
      el.focus()
      const len = prefill.text.length
      el.setSelectionRange(len, len)
    })
  }, [prefill, setAtMenu])

  const filteredCommands = atMenu
    ? AT_COMMAND_DEFS.filter((cmd) =>
        cmd.name.toLowerCase().includes(atMenu.query.toLowerCase())
      )
    : []

  const handleSend = useCallback(() => {
    const trimmed = input.trim()
    if (!trimmed || disabled || isStreaming) return
    onSend(trimmed, attachedFiles.length > 0 ? attachedFiles : undefined)
    setInput("")
    setAttachedFiles([])
    setAtMenu(null)
  }, [input, disabled, isStreaming, onSend, attachedFiles, setAttachedFiles, setAtMenu])

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLTextAreaElement>) => {
    // @ menu navigation
    if (atMenu && filteredCommands.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault()
        setAtMenu({ ...atMenu, index: Math.min(atMenu.index + 1, filteredCommands.length - 1) })
        return
      }
      if (e.key === "ArrowUp") {
        e.preventDefault()
        setAtMenu({ ...atMenu, index: Math.max(atMenu.index - 1, 0) })
        return
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault()
        const cmd = filteredCommands[atMenu.index]
        if (cmd) {
          const before = input.slice(0, input.lastIndexOf("@"))
          setInput(`${before}@${cmd.name} `)
          setAtMenu(null)
        }
        return
      }
      if (e.key === "Escape") {
        setAtMenu(null)
        return
      }
    }

    // Send on Enter (no shift)
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }, [atMenu, filteredCommands, input, handleSend, setAtMenu])

  const handleChange = useCallback((value: string) => {
    setInput(value)

    // Detect @ command trigger
    const atIdx = value.lastIndexOf("@")
    if (atIdx >= 0 && (atIdx === 0 || value[atIdx - 1] === " " || value[atIdx - 1] === "\n")) {
      const query = value.slice(atIdx + 1)
      if (!query.includes(" ")) {
        setAtMenu({ query, index: 0 })
        return
      }
    }
    setAtMenu(null)
  }, [setAtMenu])

  const uploadFiles = useCallback(async (files: File[]) => {
    if (files.length === 0 || !activeSessionId) return
    setIsUploading(true)

    try {
      const formData = new FormData()
      for (const file of files) {
        formData.append("files", file)
      }
      formData.append("sessionId", activeSessionId)

      const res = await brokerFetch("/api/broker/upload", {
        method: "POST",
        body: formData,
      })

      if (res.ok) {
        const data = await res.json()
        const uploaded: UploadedFile[] = data.files || []
        setAttachedFiles([...attachedFiles, ...uploaded])
      }
    } catch {
      // silent
    } finally {
      setIsUploading(false)
    }
  }, [activeSessionId, attachedFiles, setAttachedFiles, setIsUploading])

  const handleFileUpload = useCallback((files: FileList | null) => {
    if (!files) return
    void uploadFiles(Array.from(files))
  }, [uploadFiles])

  const handlePaste = useCallback((e: ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items
    if (!items) return
    const pasted: File[] = []
    for (const item of Array.from(items)) {
      if (item.kind === "file") {
        const f = item.getAsFile()
        if (f) pasted.push(f)
      }
    }
    if (pasted.length > 0) {
      e.preventDefault()
      void uploadFiles(pasted)
    }
  }, [uploadFiles])

  const [isDragging, setIsDragging] = useState(false)

  // Track window-level drag enter/leave counts so we can reliably hide the
  // overlay when the drag leaves the viewport (including: user cancels, drops
  // on another window, or just moves over a different tab). Chrome fires
  // dragover on every visible tab when a file is being dragged anywhere in
  // the OS, so we key the overlay off window-level events rather than the
  // local container — the container-level dragleave misses many exits.
  useEffect(() => {
    if (typeof window === "undefined") return
    let counter = 0
    let lastDragAt = 0
    let watchdog: ReturnType<typeof setInterval> | null = null

    const hasFiles = (e: globalThis.DragEvent): boolean => {
      const types = e.dataTransfer?.types
      if (!types) return false
      for (let i = 0; i < types.length; i++) {
        if (types[i] === "Files") return true
      }
      return false
    }

    const reset = () => {
      counter = 0
      lastDragAt = 0
      setIsDragging(false)
      if (watchdog) { clearInterval(watchdog); watchdog = null }
    }

    const startWatchdog = () => {
      if (watchdog) return
      // A drag that passes through a background window (e.g. macOS screenshot
      // dragged across Chrome into the terminal) can leave `isDragging` stuck
      // because Chrome never fires `drop`/`dragend` and `dragleave` is flaky.
      // Fallback: while an overlay is showing, if no drag event has fired for
      // ~400ms, assume the drag is gone and clear the overlay.
      watchdog = setInterval(() => {
        if (Date.now() - lastDragAt > 400) reset()
      }, 150)
    }

    const onDragEnter = (e: globalThis.DragEvent) => {
      if (!hasFiles(e)) return
      counter++
      lastDragAt = Date.now()
      setIsDragging(true)
      startWatchdog()
    }

    const onDragOver = (e: globalThis.DragEvent) => {
      if (!hasFiles(e)) return
      lastDragAt = Date.now()
    }

    const onDragLeave = (e: globalThis.DragEvent) => {
      if (!hasFiles(e)) return
      counter = Math.max(0, counter - 1)
      const relatedOutside =
        !e.relatedTarget ||
        (e.relatedTarget as Node).nodeType === Node.DOCUMENT_NODE
      if (counter === 0 || relatedOutside) reset()
    }

    window.addEventListener("dragenter", onDragEnter)
    window.addEventListener("dragover", onDragOver)
    window.addEventListener("dragleave", onDragLeave)
    window.addEventListener("drop", reset)
    window.addEventListener("dragend", reset)
    window.addEventListener("blur", reset)
    document.addEventListener("visibilitychange", reset)

    return () => {
      window.removeEventListener("dragenter", onDragEnter)
      window.removeEventListener("dragover", onDragOver)
      window.removeEventListener("dragleave", onDragLeave)
      window.removeEventListener("drop", reset)
      window.removeEventListener("dragend", reset)
      window.removeEventListener("blur", reset)
      document.removeEventListener("visibilitychange", reset)
      if (watchdog) clearInterval(watchdog)
    }
  }, [])

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    if (!e.dataTransfer?.types?.includes("Files")) return
    // Required so the browser treats the container as a valid drop target —
    // without preventDefault the drop event never fires.
    e.preventDefault()
    e.dataTransfer.dropEffect = "copy"
  }, [])

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    const files = e.dataTransfer?.files
    if (!files || files.length === 0) return
    e.preventDefault()
    setIsDragging(false)
    void uploadFiles(Array.from(files))
  }, [uploadFiles])

  const removeFile = useCallback((fileId: string) => {
    setAttachedFiles(attachedFiles.filter((f) => f.fileId !== fileId))
  }, [attachedFiles, setAttachedFiles])

  const isDisabled = disabled || isStreaming || outOfCredits

  return (
    <div
      className={clsx(s.container, isDragging && s.containerDragging)}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {isDragging && (
        <div className={s.dropOverlay}>
          <button
            type="button"
            className={s.dropOverlayClose}
            onClick={() => setIsDragging(false)}
            title={t("studio.dismiss") || "Dismiss"}
            aria-label="Dismiss drop overlay"
          >
            <Icon icon="hugeicons:cancel-01" />
          </button>
          <Icon icon="hugeicons:upload-04" />
          <span>{t("studio.dropToUpload")}</span>
        </div>
      )}
      {/* @ Command menu */}
      {atMenu && filteredCommands.length > 0 && (
        <div className={s.atMenu}>
          {filteredCommands.map((cmd, i) => (
            <button
              key={cmd.name}
              className={clsx(s.atItem, i === atMenu.index && s.atItemActive)}
              onMouseDown={(e) => {
                e.preventDefault()
                const before = input.slice(0, input.lastIndexOf("@"))
                setInput(`${before}@${cmd.name} `)
                setAtMenu(null)
                inputRef.current?.focus()
              }}
            >
              <span className={s.atName}>@{cmd.name}</span>
              <span className={s.atDesc}>{t(cmd.descKey)}</span>
            </button>
          ))}
        </div>
      )}

      {/* Attached repo chip */}
      {importedRepo && (
        <div className={s.files}>
          <button
            type="button"
            className={s.repoChip}
            onClick={() => setRepoModalOpen(true)}
            title={t("studio.importRepoManage")}
          >
            <Icon icon="hugeicons:github-01" />
            <span>{repoDisplay(importedRepo.url)}</span>
            {importedRepo.branch && <span className={s.repoBranch}>#{importedRepo.branch}</span>}
          </button>
        </div>
      )}

      {/* Attached files */}
      {attachedFiles.length > 0 && (
        <div className={s.files}>
          {attachedFiles.map((file) => (
            <div key={file.fileId} className={s.fileChip}>
              <Icon icon="hugeicons:file-02" />
              <span>{file.name}</span>
              <button onClick={() => removeFile(file.fileId)} className={s.fileRemove}>
                <Icon icon="hugeicons:cancel-01" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Out-of-credits banner */}
      {outOfCredits && (
        <div className={s.outOfCreditsBanner} role="alert">
          <Icon icon="hugeicons:credit-card" />
          <div className={s.outOfCreditsCopy}>
            <strong>{t("studio.outOfCreditsTitle")}</strong>
            <span>{t("studio.outOfCreditsDesc")}</span>
          </div>
          <a href={BILLING_HREF} className={s.outOfCreditsCta}>
            {t("studio.upgradePlan")}
            <Icon icon="hugeicons:arrow-right-02" />
          </a>
        </div>
      )}

      {/* Input row */}
      <div className={s.inputRow}>
        <button
          className={s.attachBtn}
          onClick={() => fileInputRef.current?.click()}
          disabled={isDisabled || isUploading || !activeSessionId}
          title={t("studio.attachFile")}
        >
          <Icon icon={isUploading ? "hugeicons:loading-03" : "hugeicons:attachment-02"} />
        </button>

        <button
          className={clsx(s.attachBtn, importedRepo && s.attachBtnActive)}
          onClick={() => setRepoModalOpen(true)}
          disabled={isDisabled}
          title={importedRepo ? t("studio.importRepoManage") : t("studio.importRepoAttachTitle")}
        >
          <Icon icon="hugeicons:github-01" />
        </button>

        <textarea
          ref={inputRef}
          className={s.textarea}
          value={input}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={
            outOfCredits ? t("studio.outOfCreditsPlaceholder") : t("studio.chatPlaceholder")
          }
          rows={1}
          disabled={isDisabled}
        />

        <button
          className={s.sendBtn}
          onClick={handleSend}
          disabled={isDisabled || !input.trim()}
        >
          <Icon icon="hugeicons:arrow-up-02" />
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        hidden
        onChange={(e) => handleFileUpload(e.target.files)}
      />

      {repoModalOpen && (
        <ImportRepoModal
          sessionId={activeSessionId}
          onClose={() => setRepoModalOpen(false)}
          onEnsureSession={onEnsureSession}
        />
      )}
    </div>
  )
}

function repoDisplay(url: string): string {
  try {
    const u = new URL(url)
    const path = u.pathname.replace(/^\/+/, "").replace(/\.git$/, "")
    return path || u.host
  } catch {
    return url.replace(/\.git$/, "")
  }
}
