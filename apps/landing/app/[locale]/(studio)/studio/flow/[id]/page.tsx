import { redirect } from "next/navigation"

interface Props {
  params: Promise<{ locale: string; id: string }>
}

// Legacy URL shape `/studio/flow/<id>` → forward to the canonical
// `/studio/project/<id>`. The "flow" suite is one of the routes the
// project page exposes, but the flow-specific URL was being emitted
// (by the agent / old links) without ever having a corresponding page.
// Without this redirect those URLs hit the root 404 and crashed the
// header (no SessionProvider in scope on the root not-found.tsx).
export default async function StudioFlowRedirect({ params }: Props) {
  const { locale, id } = await params
  redirect(`/${locale}/studio/project/${id}`)
}
