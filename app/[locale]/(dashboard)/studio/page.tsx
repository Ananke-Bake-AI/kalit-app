import { Suspense } from "react"
import { StudioClient } from "./studio-client"

export default function StudioPage() {
  return (
    <Suspense>
      <StudioClient />
    </Suspense>
  )
}
