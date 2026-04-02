import { Wrapper } from "@/components/layout/wrapper"
import { auth } from "@/lib/auth"

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()

  return (
    <Wrapper session={session} color4bg={true}>
      {children}
    </Wrapper>
  )
}
