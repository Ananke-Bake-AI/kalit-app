import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import bcrypt from "bcryptjs"
import authConfig from "./auth.config"
import { prisma } from "./prisma"

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
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
          orgId: user.memberships[0]?.orgId || null
        }
      }
    }),
    ...authConfig.providers
  ]
})
