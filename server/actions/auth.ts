"use server"

import { prisma } from "@/lib/prisma"
import { registerSchema, type RegisterInput } from "@/schemas/auth"
import bcrypt from "bcryptjs"

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

  return { success: true, userId: user.id }
}
