"use client"

import { Button } from "@/components/button"
import { acceptInvitation } from "@/server/actions/team"
import { useState, useTransition } from "react"

export function AcceptInviteButton({
  invitationId,
}: {
  invitationId: string
  orgSlug: string
}) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleAccept = () => {
    setError(null)
    startTransition(async () => {
      const result = await acceptInvitation(invitationId)
      if ("error" in result) {
        setError(result.error || "Acceptance failed")
        return
      }
      // Hard navigation so the next request rebuilds the JWT with the new
      // membership picked up — auth() reads orgId from the token.
      window.location.href = "/studio"
    })
  }

  return (
    <>
      <Button onClick={handleAccept} disabled={pending}>
        {pending ? "Accepting…" : "Accept invitation"}
      </Button>
      {error && (
        <p
          style={{
            marginTop: "0.75rem",
            color: "var(--danger)",
            fontSize: "0.85rem",
          }}
        >
          {error}
        </p>
      )}
    </>
  )
}
