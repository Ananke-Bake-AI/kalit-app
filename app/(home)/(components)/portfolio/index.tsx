import { Container } from "@/components/container"
import { Heading } from "@/components/heading"
import { Icon } from "@iconify/react"
import s from "./portfolio.module.scss"

export const Portfolio = () => {
  return (
    <section className={s.portfolio}>
      <Container>
        <Heading
          className={s.heading}
          subtitle="Kalit Portfolio"
          paragraph="Over +1000 users have already launched their projects with Kalit."
        >
          <span data-icon="left">
            Let
            <span data-icon-svg>
              <Icon icon="hugeicons:ai-idea" />
            </span>
          </span>{" "}
          your imagination run wild,
          <br />
          Kalit will create it
        </Heading>
      </Container>
    </section>
  )
}
