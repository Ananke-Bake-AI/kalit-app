import { Suspense } from "react"
import { StudioV2Client } from "./studio-v2-client"

export default function StudioV2Page() {
  return (
    <Suspense>
      <StudioV2Client />
    </Suspense>
  )
}
