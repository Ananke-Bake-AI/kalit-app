import { Portfolio } from "@/components/portfolio"
import { Underline } from "@/components/underline"
import { Architecture } from "./(components)/architecture"
import { Choose } from "./(components)/choose"
import { Features } from "./(components)/features"
import { Hero } from "./(components)/hero"
import { Join } from "./(components)/join"
import { Stack } from "./(components)/stack"

export default function HomePage() {
  return (
    <>
      <Hero />
      <Stack />
      <Architecture />
      <Features />
      <Join />
      <Portfolio
        subtitle="Kalit Portfolio"
        heading={
          <>
            Let your imagination run wild, <br />
            Kalit will create it
          </>
        }
        paragraph={
          <>
            Real projects <Underline>built and shipped</Underline> by founders using Kalit.
          </>
        }
        buttonText="Explore more projects"
        link="/flow"
      />
      <Choose />
    </>
  )
}
