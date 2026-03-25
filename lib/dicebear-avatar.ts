import { createAvatar } from "@dicebear/core"
import { botttsNeutral } from "@dicebear/collection"

export interface DicebearAvatarOptions {
  size?: number
  /** 0–50, arrondi du fond dans le SVG (@see https://www.dicebear.com/styles/bottts-neutral/) */
  radius?: number
}

/**
 * Avatar SVG déterministe (même seed → même robot).
 * Style [Bottts Neutral](https://www.dicebear.com/styles/bottts-neutral/) — usage commercial OK (licence du style).
 */
export function getAvatarDataUri(seed: string, options: DicebearAvatarOptions = {}): string {
  const size = options.size ?? 128
  const radius = options.radius ?? 50
  return createAvatar(botttsNeutral, {
    seed: seed || "anonymous",
    size,
    radius,
    randomizeIds: true
  }).toDataUri()
}
