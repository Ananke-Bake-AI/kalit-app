import { Portfolio } from "@/components/portfolio"
import { Underline } from "@/components/underline"
import { Features } from "./(components)/features"
import { Hero } from "./(components)/hero"
import { How } from "./(components)/how"

export const viewport = {
  themeColor: "var(--color-2)"
}
export default function FlowPage() {
  return (
    <>
      <Hero />
      <Features />
      <How />
      <Portfolio
        subtitle="Sites built with Flow"
        heading={
          <>
            From idea to live pages, <br />
            without the grind
          </>
        }
        paragraph={
          <>
            Launch <Underline stroke="url(#color-2)">responsive sites</Underline> with AI layout, copy, and structure —
            ready to publish.
          </>
        }
        buttonText="Start building"
        link="/register"
      />
    </>
  )
}
