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
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string
    onboardingDone?: boolean
    orgId?: string | null
  }
}
