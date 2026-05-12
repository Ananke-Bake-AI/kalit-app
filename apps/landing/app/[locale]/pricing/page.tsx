import { auth } from "@/lib/auth"
import { localeHref } from "@/lib/i18n-server"
import { redirect } from "next/navigation"

// Forwarding route: agent error messages and skill prompts hardcode
// https://kalit.ai/pricing as the upgrade CTA. We send authenticated
// users straight to /settings/billing (the only real upgrade UI) and
// guests through register first so the post-login redirect lands them
// in the same place.
export default async function PricingRedirect() {
  const session = await auth()
  if (session?.user?.id) {
    redirect(await localeHref("/settings/billing"))
  }
  redirect(await localeHref("/register?next=/settings/billing"))
}
