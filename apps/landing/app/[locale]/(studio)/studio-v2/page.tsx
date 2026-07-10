import { redirect } from "next/navigation"

// /studio-v2 est désormais servi sur /studio → redirection canonique.
export default async function StudioV2Redirect({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  redirect(`/${locale}/studio`)
}
