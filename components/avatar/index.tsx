"use client"

import { getAvatarDataUri } from "@/lib/dicebear-avatar"
import clsx from "clsx"
import { useMemo } from "react"
import s from "./avatar.module.scss"

/** Résolution interne du SVG (le rendu final suit `--avatar-size` en CSS) */
const AVATAR_RENDER_PX = 256

export interface AvatarProps {
  name: string
  className?: string
}

/**
 * Avatar [DiceBear Bottts Neutral](https://www.dicebear.com/styles/bottts-neutral/) déterministe à partir du `name`.
 * Taille : `--avatar-size` sur l’élément (défaut `1em` dans le module) ; surcharger via `className`.
 */
export function Avatar({ name, className }: AvatarProps) {
  const displayName = name.trim() || "User"

  const src = useMemo(() => getAvatarDataUri(displayName, { size: AVATAR_RENDER_PX, radius: 50 }), [displayName])

  return (
    <span className={clsx(s.root, className)}>
      <img src={src} alt="" decoding="async" />
    </span>
  )
}
