import { Container } from "@/components/container"
import { Heading } from "@/components/heading"
import { Powered } from "@/components/models/powered"
import { AnimatedLine } from "@/components/svg/animated-line"
import s from "./how.module.scss"
import { Step } from "./step"

export const How = () => {
  return (
    <div className={s.how}>
      <Container>
        <Heading
          className={s.heading}
          subtitle="How it works"
          paragraph="From idea to deployed project in minutes. No barriers between your vision and a live website."
        >
          From concept to launch, <br />
          effortlessly
        </Heading>
        <div className={s.steps}>
          <Step
            icon="hugeicons:pencil-edit-02"
            number={1}
            title="Write your prompt"
            description="Describe the web project you want. Be as specific or general as you like — our AI adapts to your input."
          />
          <Step
            icon="hugeicons:ai-generative"
            number={2}
            title="Watch it generate"
            description="Our AI creates a complete, working web project based on your prompt."
          />
          <Step
            icon="hugeicons:cloud-download"
            number={3}
            title="Preview & download"
            description="Export as a ready-to-deploy package. Take full ownership of your code and host it anywhere."
          />
          <AnimatedLine
            d="M-485.326 9.5H422C444.091 9.5 462 27.4086 462 49.5V303.5C462 325.591 479.909 343.5 502 343.5H1222.5C1238.24 343.5 1251 356.512 1251 372.252C1251 387.716 1238.46 400.5 1223 400.5C1207.54 400.5 1195 387.964 1195 372.5V54.5C1195 32.4086 1212.91 14.5 1235 14.5H2057.67"
            viewBox="0 0 1700 410"
            stroke="url(#color-2)"
            className={s.line}
          />
        </div>
        <Powered title="Powered by leading AI models, orchestrated by Kalit" className={s.powered} />
      </Container>
    </div>
  )
}
