import { Container } from "@/components/container"
import { Heading } from "@/components/heading"
import { Icon } from "@iconify/react"
import s from "./features.module.scss"

export const Features = () => {
  return (
    <section className={s.features}>
      <Container>
        <Heading
          className={s.heading}
          subtitle="Our Features"
          paragraph="Post hoc impie perpetratum quod in aliis quoque iam timebatur, tamquam licentia crudelitati indulta."
        >
          Tailored AI features
          <br /> for maximum{" "}
          <span data-icon="right">
            success
            <span data-icon-svg>
              <Icon icon="hugeicons:chart-up" />
            </span>
          </span>
        </Heading>
      </Container>
    </section>
  )
}
