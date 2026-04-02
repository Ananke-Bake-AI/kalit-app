"use client"

import { useSession } from "next-auth/react"
import { useEffect } from "react"

export function SessionRefresh() {
  const { update } = useSession()

  useEffect(() => {
    // Refresh the JWT so emailVerified is updated, then hard-reload
    // to ensure the banner disappears (client cache is stale)
    update({}).then(() => {
      // Cookie is now refreshed — next full page load will have the new session
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return null
}
