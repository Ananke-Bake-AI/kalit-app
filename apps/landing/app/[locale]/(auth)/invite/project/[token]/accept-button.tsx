"use client"

import { Button } from "@/components/button"
import { useState, useTransition } from "react"

// Accepte l'invitation via le proxy broker (/api/broker/invite/<token>/accept),
// puis ouvre la session partagée du projet dans le studio. Toute erreur de
// validation (révoquée / expirée / mauvais compte) est affichée telle quelle.
export function AcceptProjectButton({ token, locale }: { token: string; locale: string }) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleAccept = () => {
    setError(null)
    startTransition(async () => {
      try {
        const r = await fetch(`/api/broker/invite/${token}/accept`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{}",
        })
        const j = await r.json().catch(() => null)
        if (!r.ok || !j?.success) {
          setError(j?.error === "invalid or expired invitation"
            ? "This invitation is invalid, expired, or was sent to a different account."
            : j?.error || "Could not accept this invitation.")
          return
        }
        const sessionId: string | undefined = j?.data?.sessionId
        // Hard navigation : le studio ouvre la session partagée du projet.
        window.location.href = sessionId
          ? `/${locale}/studio/${sessionId}`
          : `/${locale}/studio`
      } catch {
        setError("Could not accept this invitation. Please try again.")
      }
    })
  }

  return (
    <>
      <Button onClick={handleAccept} disabled={pending}>
        {pending ? "Accepting…" : "Accept invitation"}
      </Button>
      {error && (
        <p style={{ marginTop: "0.75rem", color: "var(--danger)", fontSize: "0.85rem" }}>
          {error}
        </p>
      )}
    </>
  )
}
