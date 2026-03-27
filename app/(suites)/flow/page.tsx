import { Portfolio } from "@/components/portfolio"
import { Underline } from "@/components/underline"
import { MetadataSeo } from "@/lib/metadata"
import { getSuiteById } from "@/lib/suites"
import { Features } from "./(components)/features"
import { Hero } from "./(components)/hero"
import { How } from "./(components)/how"
import { Plans } from "./(components)/plans"

export const viewport = {
  themeColor: "#12BCFF"
}

export const metadata = MetadataSeo({
  fullTitle: "Kalit Flow — Build websites in minutes",
  description:
    "Launch high-converting websites and landing pages in minutes. Design, copy, structure, and hosting included.",
  favicon: "/favicon-flow.svg",
  image: "/img/thumbnail-flow.jpg"
})

export default function FlowPage() {
  const flowSuite = getSuiteById("flow")
  const suiteAppUrl = flowSuite?.appUrl ?? ""

  return (
    <>
      <Hero suiteAppUrl={suiteAppUrl} />
      <Features suiteAppUrl={suiteAppUrl} />
      <How />
      <Plans suiteAppUrl={suiteAppUrl} />
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
        suiteAppUrl={suiteAppUrl}
      />
    </>
  )
}
