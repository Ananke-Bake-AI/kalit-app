import type { NextAuthConfig } from "next-auth"
import Discord from "next-auth/providers/discord"
import GitHub from "next-auth/providers/github"
import Google from "next-auth/providers/google"

/**
 * Config partagée (Edge / middleware) : pas d’adapter Prisma ni de Credentials ici.
 * Le middleware utilise `NextAuth(authConfig).auth` pour lire le JWT comme l’API session.
 */
export default {
  debug: true,
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
  trustHost: true,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login"
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true
    }),
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true
    }),
    Discord({
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true
    })
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.userId = user.id
        token.name = user.name
        token.email = user.email
        token.picture = user.image
        token.onboardingDone = (user as { onboardingDone?: boolean }).onboardingDone ?? false
        token.orgId = (user as { orgId?: string | null }).orgId ?? null
        token.emailVerified = !!(user as { emailVerified?: Date | null }).emailVerified
        token.isAdmin = (user as { isAdmin?: boolean }).isAdmin ?? false
      }

      if (trigger === "update" && session) {
        const patch = session as {
          onboardingDone?: boolean
          orgId?: string | null
          name?: string | null
          user?: { name?: string | null }
        }
        if (patch.onboardingDone !== undefined) {
          token.onboardingDone = patch.onboardingDone
        }
        if (patch.orgId !== undefined) {
          token.orgId = patch.orgId
        }
        const nextName = patch.name !== undefined ? patch.name : patch.user?.name
        if (nextName !== undefined) {
          token.name = nextName
        }
      }

      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId as string
        session.user.onboardingDone = token.onboardingDone as boolean
        session.user.orgId = token.orgId as string | null
        ;(session.user as { emailVerified: boolean }).emailVerified = token.emailVerified as boolean
        session.user.isAdmin = token.isAdmin as boolean
        if (token.name !== undefined) {
          session.user.name = token.name as string | null
        }
        if (token.email !== undefined) {
          session.user.email = token.email as string
        }
        if (token.picture !== undefined) {
          session.user.image = token.picture as string | null
        }
      }
      return session
    }
  }
} satisfies NextAuthConfig
