"use server"

import { prisma } from "@/lib/prisma"
import { sendVerificationEmail } from "@/lib/email"
import { registerSchema, type RegisterInput } from "@/schemas/auth"
import bcrypt from "bcryptjs"
import crypto from "crypto"

export async function register(input: RegisterInput) {
  const parsed = registerSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const { name, email, password } = parsed.data

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return { error: "An account with this email already exists" }
  }

  const hashedPassword = await bcrypt.hash(password, 12)

  const user = await prisma.user.create({
    data: { name, email, hashedPassword },
  })

  // Send verification email
  try {
    const token = crypto.randomBytes(32).toString("hex")
    await prisma.verificationToken.create({
      data: {
        identifier: email,
        token,
        expires: new Date(Date.now() + 86400000), // 24 hours
      },
    })
    await sendVerificationEmail(email, token)
  } catch {
    // Don't block registration if email fails
  }

  return { success: true, userId: user.id }
}

export async function verifyEmail(token: string) {
  if (!token) return { error: "Invalid verification link" }

  const verificationToken = await prisma.verificationToken.findUnique({
    where: { token },
  })

  if (!verificationToken) {
    return { error: "Invalid or expired verification link" }
  }

  if (verificationToken.expires < new Date()) {
    await prisma.verificationToken.delete({
      where: { identifier_token: { identifier: verificationToken.identifier, token } },
    })
    return { error: "Verification link has expired" }
  }

  await prisma.user.update({
    where: { email: verificationToken.identifier },
    data: { emailVerified: new Date() },
  })

  await prisma.verificationToken.delete({
    where: { identifier_token: { identifier: verificationToken.identifier, token } },
  })

  return { success: true }
}
