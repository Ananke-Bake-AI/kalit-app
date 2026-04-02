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
  }
}
