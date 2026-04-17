import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { App as CapacitorApp, type URLOpenListenerEvent } from "@capacitor/app"
import { Browser } from "@capacitor/browser"
import { setBrokerToken, clearBrokerToken } from "../broker"
import type { MobileAuthUser } from "../types/global"

type AuthState = {
  status: "loading" | "signed-out" | "signed-in"
  user: MobileAuthUser | null
  token: string | null
}

type AuthContextValue = AuthState & {
  signIn: () => Promise<void>
  signOut: () => Promise<void>
}

const USER_STORAGE_KEY = "kalit-user"
const TOKEN_STORAGE_KEY = "kalit-broker-token"
const PROTOCOL = "kalit://"

const AuthContext = createContext<AuthContextValue | null>(null)

function readInitial(): AuthState {
  if (typeof localStorage === "undefined") {
    return { status: "loading", user: null, token: null }
  }
  const token = localStorage.getItem(TOKEN_STORAGE_KEY)
  const userRaw = localStorage.getItem(USER_STORAGE_KEY)
  if (token && userRaw) {
    try {
      const user = JSON.parse(userRaw) as MobileAuthUser
      return { status: "signed-in", user, token }
    } catch {
      // fallthrough
    }
  }
  return { status: "signed-out", user: null, token: null }
}

function parseAuthDeepLink(url: string) {
  if (!url.startsWith(PROTOCOL)) return null
  try {
    const parsed = new URL(url)
    const token = parsed.searchParams.get("token")
    const userRaw = parsed.searchParams.get("user")
    if (!token) return null
    const user = userRaw ? (JSON.parse(userRaw) as MobileAuthUser) : null
    return { token, user }
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(() => readInitial())

  useEffect(() => {
    let active = true
    const sub = CapacitorApp.addListener("appUrlOpen", (event: URLOpenListenerEvent) => {
      const payload = parseAuthDeepLink(event.url)
      if (!payload || !active) return
      setBrokerToken(payload.token)
      if (payload.user) {
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(payload.user))
      }
      setState({ status: "signed-in", user: payload.user, token: payload.token })
      Browser.close().catch(() => {})
    })
    return () => {
      active = false
      sub.then((handle) => handle.remove()).catch(() => {})
    }
  }, [])

  const signIn = useCallback(async () => {
    const landingBase = import.meta.env.VITE_KALIT_WEB_URL || "https://kalit.ai"
    const redirect = encodeURIComponent("kalit://auth/callback")
    const url = `${landingBase}/en/auth/desktop?redirect=${redirect}`
    await Browser.open({ url, presentationStyle: "popover" })
  }, [])

  const signOut = useCallback(async () => {
    clearBrokerToken()
    localStorage.removeItem(USER_STORAGE_KEY)
    setState({ status: "signed-out", user: null, token: null })
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ ...state, signIn, signOut }),
    [state, signIn, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}
