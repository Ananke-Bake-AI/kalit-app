import { Wrapper } from "@/components/layout/wrapper"
import { auth } from "@/lib/auth"

export default async function HomeLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()

  return (
    <Wrapper session={session} color4bg={false}>
      {children}
    </Wrapper>
  )
}
