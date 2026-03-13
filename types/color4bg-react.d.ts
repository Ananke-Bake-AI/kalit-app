declare module '@color4bg/react' {
  import type { FC } from 'react'

  interface Color4BgProps {
    style: string
    colors?: string[]
    seed?: number
    loop?: boolean
    options?: Record<string, unknown>
  }

  export const Color4Bg: FC<Color4BgProps>
  export default Color4Bg
}
