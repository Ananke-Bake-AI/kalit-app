"use client"

import { useEffect } from "react"
import { Icon } from "@/components/icon"
import { useI18n } from "@/stores/i18n"
import s from "./file-preview-modal.module.scss"

interface FilePreviewModalProps {
  url: string
  name: string
  onClose: () => void
}

export function FilePreviewModal({ url, name, onClose }: FilePreviewModalProps) {
  const { t } = useI18n()
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [onClose])

  return (
    <div className={s.overlay} onClick={onClose}>
      <div className={s.container} onClick={(e) => e.stopPropagation()}>
        <button className={s.closeBtn} onClick={onClose} title={t("studio.close")}>
          <Icon icon="hugeicons:cancel-01" />
        </button>

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt={name} className={s.image} />

        <div className={s.footer}>
          <span className={s.fileName}>{name}</span>
          <a href={url} download={name} className={s.downloadBtn}>
            <Icon icon="hugeicons:download-04" />
            {t("studio.download")}
          </a>
        </div>
      </div>
    </div>
  )
}
