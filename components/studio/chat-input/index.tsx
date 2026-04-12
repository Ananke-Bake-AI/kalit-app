"use client"

import { useCallback, useRef, useState, type KeyboardEvent } from "react"
import { useStudioStore } from "@/stores/studio"
import { useI18n } from "@/stores/i18n"
import { brokerFetch } from "@/lib/broker-direct"
import { Icon } from "@/components/icon"
import type { AtCommand, UploadedFile } from "@/types/studio"
import clsx from "clsx"
import s from "./chat-input.module.scss"

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
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const { t } = useI18n()
  const [input, setInput] = useState("")
  const {
    atMenu,
    setAtMenu,
    attachedFiles,
    setAttachedFiles,
    isUploading,
    setIsUploading,
    activeSessionId,
    isStreaming,
  } = useStudioStore()

  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  const handleFileUpload = useCallback(async (files: FileList | null) => {
    if (!files || !activeSessionId) return
    setIsUploading(true)

    try {
      const formData = new FormData()
      for (const file of Array.from(files)) {
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

  const removeFile = useCallback((fileId: string) => {
    setAttachedFiles(attachedFiles.filter((f) => f.fileId !== fileId))
  }, [attachedFiles, setAttachedFiles])

  const isDisabled = disabled || isStreaming

  return (
    <div className={s.container}>
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

      {/* Input row */}
      <div className={s.inputRow}>
        <button
          className={s.attachBtn}
          onClick={() => fileInputRef.current?.click()}
          disabled={isDisabled || isUploading}
          title={t("studio.attachFile")}
        >
          <Icon icon={isUploading ? "hugeicons:loading-03" : "hugeicons:attachment-02"} />
        </button>

        <textarea
          ref={inputRef}
          className={s.textarea}
          value={input}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t("studio.chatPlaceholder")}
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
    </div>
  )
}
