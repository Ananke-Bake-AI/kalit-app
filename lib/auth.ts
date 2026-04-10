import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import bcrypt from "bcryptjs"
import authConfig from "./auth.config"
import { prisma } from "./prisma"

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  callbacks: {
    ...authConfig.callbacks,
    async jwt(params) {
      // Run the base jwt callback from authConfig
      const token = await authConfig.callbacks!.jwt!(params)

      // On sign-in or when key fields are missing/falsy, re-check DB
      // This ensures OAuth users get onboardingDone, orgId, etc. that
      // the Prisma adapter doesn't include in the default user object.
      if (params.user || !token.emailVerified || token.isAdmin === undefined || params.trigger === "update") {
        if (token.email) {
          const dbUser = await prisma.user.findUnique({
            where: { email: token.email },
            select: {
              emailVerified: true,
              isAdmin: true,
              onboardingDone: true,
              memberships: {
                where: { isCurrent: true },
                take: 1,
                select: { orgId: true },
              },
            },
          })
          if (dbUser) {
            token.emailVerified = !!dbUser.emailVerified
            token.isAdmin = dbUser.isAdmin ?? false
            token.onboardingDone = dbUser.onboardingDone ?? false
            token.orgId = dbUser.memberships[0]?.orgId ?? null
          }
        }
      }

      return token
    },
    async session(params) {
      return authConfig.callbacks!.session!(params)
    },
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
          include: {
            memberships: {
              where: { isCurrent: true },
              take: 1
            }
          }
        })

        if (!user || !user.hashedPassword) return null

        const passwordMatch = await bcrypt.compare(credentials.password as string, user.hashedPassword)

        if (!passwordMatch) return null

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          onboardingDone: user.onboardingDone,
          emailVerified: user.emailVerified,
          isAdmin: user.isAdmin,
          orgId: user.memberships[0]?.orgId || null
        }
      }
    }),
    ...authConfig.providers
  ]
})
