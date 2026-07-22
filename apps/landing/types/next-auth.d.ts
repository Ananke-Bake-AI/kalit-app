import "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      email: string
      name?: string | null
      image?: string | null
      onboardingDone: boolean
      orgId: string | null
      emailVerified: boolean
      isAdmin: boolean
      /** Set only on the session created right after the adapter created the
       *  user (OAuth signup) — drives the one-shot signup conversion event. */
      signupAt?: number
      signupMethod?: string
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string
    name?: string | null
    email?: string
    picture?: string | null
    onboardingDone?: boolean
    orgId?: string | null
    emailVerified?: boolean
    isAdmin?: boolean
    signupAt?: number
    signupMethod?: string
  }
}
