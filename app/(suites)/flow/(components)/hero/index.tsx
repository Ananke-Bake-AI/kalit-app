import { Button } from "@/components/button"
import { Color4Bg } from "@/components/color4bg"
import { Container } from "@/components/container"
import { Heading } from "@/components/heading"
import { Icon } from "@/components/icon"
import { AnimatedLine } from "@/components/svg/animated-line"
import { FlowHeroPrompt } from "./flow-hero-prompt"
import s from "./hero.module.scss"

export const Hero = () => {
  return (
    <section className={s.hero}>
      <Container>
        <div className={s.layout}>
          <div className={s.left}>
            <Heading
              className={s.heading}
              subtitle="AI-powered project generation"
              paragraph="Powered by AI, Flow turns your ideas into fully working web projects in seconds."
            >
              Build websites <br />
              <span className={s.strong}>
                Instantly{" "}
                <AnimatedLine
                  className={s.line}
                  viewBox="0 0 1031 203"
                  stroke="url(#flow-hero)"
                  d="M8.71289 198.5L18.256 176.551C24.6057 161.947 39.0137 152.5 54.9388 152.5H886.713C908.804 152.5 926.713 134.591 926.713 112.5V49.5C926.713 27.4086 944.621 9.5 966.713 9.5H1458.71"
                />
              </span>
            </Heading>
            <ul className={s.list}>
              <li>
                <Icon icon="hugeicons:stars" />
                <span>Free to start</span>
              </li>
              <li>
                <Icon icon="hugeicons:credit-card-not-accept" />
                <span>No credit card</span>
              </li>
              <li>
                <Icon icon="hugeicons:token-circle" />
                <span>100 tokens included</span>
              </li>
            </ul>
            <Button circle className={s.button}>
              Get started
            </Button>
          </div>
          <div className={s.right}>
            <FlowHeroPrompt />
          </div>
        </div>
        <div className={s.bg} data-reveal>
          <Color4Bg className={s.gradient} style="blur-gradient" colors={["#12BCFF", "#6CF4FB"]} />
        </div>
      </Container>
    </section>
  )
}
