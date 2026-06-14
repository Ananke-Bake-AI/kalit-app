import { Wrapper } from "@/components/layout/wrapper"
import { safeAuth } from "@/lib/auth"

export default async function HomeLayout({ children }: { children: React.ReactNode }) {
  const session = await safeAuth()

  return (
    <Wrapper session={session} color4bg={false}>
      {children}
    </Wrapper>
  )
}
