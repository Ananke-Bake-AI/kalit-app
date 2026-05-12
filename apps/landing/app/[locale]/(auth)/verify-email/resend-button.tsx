"use client"

import { Button } from "@/components/button"
import { resendVerificationEmail } from "@/server/actions/auth"
import { useTranslation } from "@/stores/i18n"
import { useState } from "react"
import { toast } from "sonner"

/**
 * Inline "resend verification email" trigger used on the verify-email
 * pending screen. Wraps the same server action the EmailBanner uses,
 * just rendered as a primary button instead of a banner pill.
 */
export function ResendButton() {
  const t = useTranslation()
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  const handleClick = async () => {
    setSending(true)
    const result = await resendVerificationEmail()
    setSending(false)
    if (result.error) {
      toast.error(result.error)
      return
    }
    toast.success(t("auth.verificationSent"))
    setSent(true)
  }

  return (
    <Button onClick={handleClick} disabled={sending || sent}>
      {sending ? t("auth.sendingEmail") : sent ? t("auth.verificationSent") : t("auth.resendEmail")}
    </Button>
  )
}
