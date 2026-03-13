import { Architecture } from "./(components)/architecture"
import { Choose } from "./(components)/choose"
import { Features } from "./(components)/features"
import { Hero } from "./(components)/hero"
import { Join } from "./(components)/join"
import { Portfolio } from "./(components)/portfolio"
import { Stack } from "./(components)/stack"
import { Try } from "./(components)/try"

export default function HomePage() {
  return (
    <>
      <Hero />
      <Stack />
      <Architecture />
      <Features />
      <Join />
      <Portfolio />
      <Choose />
      <Try />
    </>
  )
}
