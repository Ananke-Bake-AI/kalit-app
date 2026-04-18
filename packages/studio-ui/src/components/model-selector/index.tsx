"use client"

import { useEffect, useRef, useState } from "react"
import { useStudioUser } from "../../host"
import { useStudioStore } from "../../store"
import s from "./model-selector.module.scss"

interface ModelOption {
  id: string
  label: string
  provider: "ollama" | "anthropic" | "mistral" | "openai"
}

const MODEL_GROUPS: { label: string; models: ModelOption[] }[] = [
  {
    label: "Ollama Cloud",
    models: [
      { id: "minimax-m2.7:cloud", label: "minimax-m2.7", provider: "ollama" },
      { id: "minimax-m2.5:cloud", label: "minimax-m2.5", provider: "ollama" },
      { id: "glm-5.1:cloud", label: "glm-5.1", provider: "ollama" },
      { id: "glm-5:cloud", label: "glm-5", provider: "ollama" },
      { id: "deepseek-v3.2:cloud", label: "deepseek-v3.2", provider: "ollama" },
      { id: "qwen3.5:397b-cloud", label: "qwen3.5 397b", provider: "ollama" },
      { id: "qwen3-coder:480b-cloud", label: "qwen3-coder 480b", provider: "ollama" },
      { id: "kimi-k2.5:cloud", label: "kimi-k2.5", provider: "ollama" },
      { id: "mistral-large-3:675b-cloud", label: "mistral-large-3 675b", provider: "ollama" },
      { id: "gemma4:31b-cloud", label: "gemma4 31b", provider: "ollama" },
      { id: "nemotron-3-super:cloud", label: "nemotron-3-super", provider: "ollama" },
    ],
  },
  {
    label: "Anthropic",
    models: [
      { id: "anthropic:claude-sonnet-4-6", label: "claude-sonnet-4-6", provider: "anthropic" },
      { id: "anthropic:claude-haiku-4-5-20251001", label: "claude-haiku-4.5", provider: "anthropic" },
      { id: "anthropic:claude-opus-4-6", label: "claude-opus-4-6", provider: "anthropic" },
    ],
  },
  {
    label: "Mistral",
    models: [
      { id: "mistral:mistral-large-latest", label: "mistral-large", provider: "mistral" as const },
      { id: "mistral:mistral-small-latest", label: "mistral-small", provider: "mistral" as const },
      { id: "mistral:codestral-latest", label: "codestral", provider: "mistral" as const },
      { id: "mistral:devstral-small-latest", label: "devstral-small", provider: "mistral" as const },
    ],
  },
  {
    label: "OpenAI",
    models: [
      { id: "openai:gpt-4.1", label: "gpt-4.1", provider: "openai" },
      { id: "openai:gpt-4.1-mini", label: "gpt-4.1-mini", provider: "openai" },
      { id: "openai:gpt-4.1-nano", label: "gpt-4.1-nano", provider: "openai" },
      { id: "openai:o3", label: "o3", provider: "openai" },
      { id: "openai:o4-mini", label: "o4-mini", provider: "openai" },
    ],
  },
]

const STORAGE_KEY = "kalit_admin_model"
const DEFAULT_MODEL = "anthropic:claude-haiku-4-5-20251001"

export function ModelSelector() {
  const user = useStudioUser()
  const selectedModel = useStudioStore((st) => st.selectedModel)
  const setSelectedModel = useStudioStore((st) => st.setSelectedModel)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) setSelectedModel(saved)
    } catch { /* noop */ }
  }, [setSelectedModel])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [open])

  if (!user?.isAdmin) return null

  const current = MODEL_GROUPS.flatMap((g) => g.models).find((m) => m.id === selectedModel)
  const displayLabel = current?.label ?? selectedModel

  function handleSelect(modelId: string) {
    setSelectedModel(modelId)
    try { localStorage.setItem(STORAGE_KEY, modelId) } catch { /* noop */ }
    setOpen(false)
  }

  return (
    <div className={s.wrapper} ref={ref}>
      <button
        type="button"
        className={s.trigger}
        onClick={() => setOpen(!open)}
        title={`Model: ${selectedModel}`}
      >
        <span className={s.dot} data-provider={current?.provider ?? "ollama"} />
        <span className={s.label}>{displayLabel}</span>
        <span className={s.chevron} data-open={open}>▾</span>
      </button>

      {open && (
        <div className={s.dropdown}>
          {MODEL_GROUPS.map((group) => (
            <div key={group.label} className={s.group}>
              <div className={s.groupLabel}>{group.label}</div>
              {group.models.map((model) => (
                <button
                  key={model.id}
                  type="button"
                  className={s.item}
                  data-active={model.id === selectedModel}
                  onClick={() => handleSelect(model.id)}
                >
                  <span className={s.dot} data-provider={model.provider} />
                  <span className={s.modelName}>{model.label}</span>
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
