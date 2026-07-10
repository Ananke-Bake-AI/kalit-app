import { Suspense } from "react"
// Le studio v2 est désormais LE studio (servi sur /studio).
import { StudioV2Client } from "../studio-v2/studio-v2-client"

export default function StudioPage() {
  return (
    <Suspense>
      <StudioV2Client />
    </Suspense>
  )
}
