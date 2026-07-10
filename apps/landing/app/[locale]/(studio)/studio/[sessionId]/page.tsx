import { Suspense } from "react"
// Deep-link d'une session : /studio/<sessionId> rend LE studio avec la session
// pré-sélectionnée (partageable + pratique pour debug). Les segments statiques
// frères (flow, project) restent prioritaires ; <sessionId> est un UUID.
import { StudioV2Client } from "../../studio-v2/studio-v2-client"

export default async function StudioSessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>
}) {
  const { sessionId } = await params
  return (
    <Suspense>
      <StudioV2Client initialSessionId={sessionId} />
    </Suspense>
  )
}
