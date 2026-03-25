import { Features } from "./(components)/features"
import { Hero } from "./(components)/hero"

export const viewport = {
  themeColor: "red"
}
export default function FlowPage() {
  return (
    <>
      <Hero />
      <Features />
    </>
  )
}
