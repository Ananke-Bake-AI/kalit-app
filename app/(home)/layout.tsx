import { auth } from "@/lib/auth"
import { Wrapper } from "@/components/layout/wrapper"

export default async function HomeLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()

  return <Wrapper session={session}>{children}</Wrapper>
}
