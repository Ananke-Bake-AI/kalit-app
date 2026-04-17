export type DesktopAuthUser = {
  id?: string
  email?: string
  name?: string | null
  image?: string | null
  isAdmin?: boolean
}

export type DesktopAuthPayload = {
  token: string
  user: DesktopAuthUser | null
}

declare global {
  interface Window {
    kalit?: {
      openExternal: (url: string) => Promise<void>
      signOut: () => Promise<boolean>
      onAuthToken: (cb: (payload: DesktopAuthPayload) => void) => () => void
      platform: NodeJS.Platform
    }
  }
}
