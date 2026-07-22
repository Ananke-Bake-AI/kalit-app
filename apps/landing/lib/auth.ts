import NextAuth, { type Session } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import bcrypt from "bcryptjs"
import authConfig from "./auth.config"
import { prisma } from "./prisma"

// Normalize emails to lowercase on user creation. Identity checks lowercase
// the email before lookup (requireAdmin/isAdmin, the jwt backfill below, the
// credentials authorize), but OAuth providers can return mixed-case emails
// (e.g. "Karmendra01@gmail.com") — which silently broke admin access (the
// badge showed in the menu but the /admin page redirected to /dashboard).
// Lowercasing at the single creation chokepoint keeps stored email consistent
// across all providers.
const prismaAdapter = PrismaAdapter(prisma)
const adapter: typeof prismaAdapter = {
  ...prismaAdapter,
  createUser: (data) =>
    prismaAdapter.createUser!({ ...data, email: data.email.toLowerCase() }),
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  adapter,
  callbacks: {
    ...authConfig.callbacks,
    async jwt(params) {
      // Run the base jwt callback from authConfig
      const token = await authConfig.callbacks!.jwt!(params)

      // Analytics: trigger === "signUp" means the adapter just CREATED this
      // user (first-ever OAuth sign-in). Stamp the moment + method so the
      // client can fire the signup conversion exactly once, post-redirect —
      // the register page used to fire it optimistically on OAuth button
      // *click*, which counted existing users logging in and abandoned OAuth
      // attempts (Meta reported ~1k CompleteRegistration for ~600 accounts).
      // Account linking to an existing user triggers "signIn", not "signUp",
      // so returning users can never re-stamp.
      if (params.trigger === "signUp") {
        token.signupAt = Date.now()
        token.signupMethod = params.account?.provider ?? "oauth"
      }

      // On sign-in or when key fields are missing/falsy, re-check DB
      // This ensures OAuth users get onboardingDone, orgId, etc. that
      // the Prisma adapter doesn't include in the default user object.
      if (params.user || !token.emailVerified || token.isAdmin === undefined || params.trigger === "update") {
        if (token.email) {
          const dbUser = await prisma.user.findUnique({
            where: { email: token.email.toLowerCase() },
            select: {
              id: true,
              emailVerified: true,
              isAdmin: true,
              onboardingDone: true,
              memberships: {
                where: { isCurrent: true },
                take: 1,
                select: { orgId: true },
              },
              accounts: {
                take: 1,
                select: { provider: true },
              },
            },
          })
          if (dbUser) {
            // OAuth providers already verify emails — if the user has an
            // OAuth account but emailVerified is null, backfill it now.
            if (!dbUser.emailVerified && dbUser.accounts.length > 0) {
              await prisma.user.update({
                where: { id: dbUser.id },
                data: { emailVerified: new Date() },
              })
              dbUser.emailVerified = new Date()
            }
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
      const session = await authConfig.callbacks!.session!(params)
      // Surface the signup stamp so SignupConversionTracker (client) can fire
      // the conversion once. Time-boxed client-side; harmless to expose.
      if (session.user && typeof params.token.signupAt === "number") {
        session.user.signupAt = params.token.signupAt
        session.user.signupMethod = (params.token.signupMethod as string) ?? "oauth"
      }
      return session
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
          where: { email: (credentials.email as string).toLowerCase() },
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

// Session lookup hits the DB (Neon). On public pages a transient DB/auth blip
// would otherwise throw during SSR and render the route's error boundary —
// which is exactly the "Something went wrong" page crawlers (PageSpeed/Googlebot)
// were occasionally capturing. For pages that work fine for anonymous visitors,
// degrade to "no session" instead of nuking the whole render.
export async function safeAuth(): Promise<Session | null> {
  try {
    return await auth()
  } catch (err) {
    console.error("safeAuth: session lookup failed, falling back to anonymous", err)
    return null
  }
}
