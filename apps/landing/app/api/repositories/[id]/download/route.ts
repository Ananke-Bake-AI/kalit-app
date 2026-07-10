import { auth } from "@/lib/auth"
import { SignJWT } from "jose"

// Télécharge un projet en .zip : proxy authentifié vers le broker
// (POST /api/flow/project/<id>/download → stream application/zip). Le broker
// restaure le workspace depuis R2 s'il a été archivé, et limite à 1×/5 min.
const BROKER_URL = (process.env.BROKER_URL || "http://localhost:9000").replace(/\/+$/, "")

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id || !session.user.email) {
    return new Response("Unauthorized", { status: 401 })
  }
  const { id } = await params
  const secret =
    process.env.BROKER_JWT_SECRET || process.env.SUITE_JWT_SECRET || process.env.AUTH_SECRET
  if (!secret) return new Response("Server misconfigured", { status: 500 })

  const token = await new SignJWT({
    email: session.user.email,
    name: session.user.name || null,
    orgId: session.user.orgId || null,
    isAdmin: session.user.isAdmin === true,
    externalUserId: session.user.id,
    externalOrgId: session.user.orgId || null,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("5m")
    .setSubject(session.user.id)
    .setIssuer("kalit-main")
    .sign(new TextEncoder().encode(secret))

  const res = await fetch(`${BROKER_URL}/api/flow/project/${id}/download`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  })
  if (!res.ok || !res.body) {
    const msg = await res.text().catch(() => "")
    return new Response(msg || "Download failed", { status: res.status })
  }
  return new Response(res.body, {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition":
        res.headers.get("Content-Disposition") || `attachment; filename="project-${id}.zip"`,
    },
  })
}
