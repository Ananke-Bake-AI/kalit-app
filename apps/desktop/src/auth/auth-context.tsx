import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { setBrokerToken, clearBrokerToken } from "../broker"
import type { DesktopAuthUser } from "../types/global"

type AuthState = {
  status: "loading" | "signed-out" | "signed-in"
  user: DesktopAuthUser | null
  token: string | null
}

type AuthContextValue = AuthState & {
  signIn: () => Promise<void>
  signOut: () => Promise<void>
}

const USER_STORAGE_KEY = "kalit-user"
const TOKEN_STORAGE_KEY = "kalit-broker-token"

const AuthContext = createContext<AuthContextValue | null>(null)

function readInitial(): AuthState {
  if (typeof localStorage === "undefined") {
    return { status: "loading", user: null, token: null }
  }
  const token = localStorage.getItem(TOKEN_STORAGE_KEY)
  const userRaw = localStorage.getItem(USER_STORAGE_KEY)
  if (token && userRaw) {
    try {
      const user = JSON.parse(userRaw) as DesktopAuthUser
      return { status: "signed-in", user, token }
    } catch {
      // Fallthrough to signed-out
    }
  }
  return { status: "signed-out", user: null, token: null }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(() => readInitial())

  useEffect(() => {
    const bridge = window.kalit
    if (!bridge) return
    const off = bridge.onAuthToken(({ token, user }) => {
      setBrokerToken(token)
      if (user) {
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user))
      }
      setState({ status: "signed-in", user: user ?? null, token })
    })
    return off
  }, [])

  const signIn = useCallback(async () => {
    const bridge = window.kalit
    const landingBase = import.meta.env.VITE_KALIT_WEB_URL || "https://kalit.ai"
    const redirect = encodeURIComponent("kalit://auth/callback")
    const url = `${landingBase}/en/auth/desktop?redirect=${redirect}`
    if (bridge) {
      await bridge.openExternal(url)
    } else {
      window.open(url, "_blank")
    }
  }, [])

  const signOut = useCallback(async () => {
    clearBrokerToken()
    localStorage.removeItem(USER_STORAGE_KEY)
    const bridge = window.kalit
    if (bridge) await bridge.signOut()
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
