"use server"

import { prisma } from "@/lib/prisma"
import { sendPasswordResetEmail } from "@/lib/email"
import { auth } from "@/lib/auth"
import bcrypt from "bcryptjs"
import crypto from "crypto"

export async function requestPasswordReset(email: string) {
  if (!email) return { error: "Email is required" }

  const user = await prisma.user.findUnique({ where: { email } })

  // Always return success to prevent email enumeration
  if (!user || !user.hashedPassword) {
    return { success: true }
  }

  // Delete any existing tokens for this email
  await prisma.passwordResetToken.deleteMany({ where: { email } })

  // Create new token (expires in 1 hour)
  const token = crypto.randomBytes(32).toString("hex")
  await prisma.passwordResetToken.create({
    data: {
      email,
      token,
      expires: new Date(Date.now() + 3600000), // 1 hour
    },
  })

  await sendPasswordResetEmail(email, token)

  return { success: true }
}

export async function resetPassword(token: string, newPassword: string) {
  if (!token || !newPassword) {
    return { error: "Token and password are required" }
  }

  if (newPassword.length < 8) {
    return { error: "Password must be at least 8 characters" }
  }

  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { token },
  })

  if (!resetToken) {
    return { error: "Invalid or expired reset link" }
  }

  if (resetToken.expires < new Date()) {
    await prisma.passwordResetToken.delete({ where: { id: resetToken.id } })
    return { error: "Reset link has expired. Please request a new one." }
  }

  const hashedPassword = await bcrypt.hash(newPassword, 12)

  await prisma.user.update({
    where: { email: resetToken.email },
    data: { hashedPassword },
  })

  await prisma.passwordResetToken.delete({ where: { id: resetToken.id } })

  return { success: true }
}

export async function changePassword(currentPassword: string, newPassword: string) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: "Not authenticated" }
  }

  if (newPassword.length < 8) {
    return { error: "New password must be at least 8 characters" }
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } })
  if (!user) {
    return { error: "User not found" }
  }

  if (!user.hashedPassword) {
    return { error: "Your account uses OAuth sign-in. You cannot set a password." }
  }

  const valid = await bcrypt.compare(currentPassword, user.hashedPassword)
  if (!valid) {
    return { error: "Current password is incorrect" }
  }

  const hashedPassword = await bcrypt.hash(newPassword, 12)
  await prisma.user.update({
    where: { id: user.id },
    data: { hashedPassword },
  })

  return { success: true }
}
