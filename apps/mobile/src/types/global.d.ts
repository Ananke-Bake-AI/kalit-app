export type MobileAuthUser = {
  id?: string
  email?: string
  name?: string | null
  image?: string | null
  isAdmin?: boolean
}

export type MobileAuthPayload = {
  token: string
  user: MobileAuthUser | null
}
