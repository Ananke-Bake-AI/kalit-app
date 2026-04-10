import { createHmac } from "crypto"

const SECRET = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || "fallback-secret"

/** HMAC-based token — deterministic, no DB needed, never expires */
export function generateUnsubscribeToken(email: string): string {
  return createHmac("sha256", SECRET).update(email.toLowerCase().trim()).digest("hex")
}

export function verifyUnsubscribeToken(email: string, token: string): boolean {
  const expected = generateUnsubscribeToken(email)
  return expected === token
}

export function getUnsubscribeUrl(email: string): string {
  const token = generateUnsubscribeToken(email)
  const base = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  return `${base}/unsubscribe?email=${encodeURIComponent(email)}&token=${token}`
}
