import { identicon } from "@dicebear/collection"
import { createAvatar } from "@dicebear/core"

export interface IdenticonOptions {
  size?: number
  radius?: number
}

/**
 * SVG identicon déterministe (même seed → même avatar).
 * @see https://www.dicebear.com/styles/identicon/
 */
export function getIdenticonDataUri(seed: string, options: IdenticonOptions = {}): string {
  const size = options.size ?? 128
  const radius = options.radius ?? 50
  return createAvatar(identicon, {
    seed: seed || "anonymous",
    size,
    radius,
    randomizeIds: true
  }).toDataUri()
}
