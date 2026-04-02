import { requireAdmin } from "@/lib/admin"
import { Wrapper } from "@/components/layout/wrapper"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdmin()

  return <Wrapper session={session}>{children}</Wrapper>
}
