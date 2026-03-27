import { Container } from "@/components/container"
import { Heading } from "@/components/heading"
import Image from "next/image"
import s from "./features.module.scss"

const FEATURES = [
  {
    img: "/img/img1.png",
    title: "Specialized AI agents coordinated as one team",
    description: "Each agent handles a role — planning, coding, design, testing, deployment. They coordinate so you don't have to."
  },
  {
    img: "/img/img2.png",
    title: "Describe your project, add references and assets",
    description: "Share screenshots, describe what you need, and let the agents match your vision. No coding required."
  },
  {
    img: "/img/img3.png",
    title: "Run multiple workflows at once",
    description: "Build your app, generate your landing page, and prepare your launch in parallel — instead of waiting on one step at a time."
  },
  {
    img: "/img/img4.png",
    title: "Go live with one click — hosting included",
    description: "Publish landing pages, deploy apps, and launch campaigns directly from Kalit. No external tools needed."
  }
]

export const Features = () => {
  return (
    <section className={s.features}>
      <Container>
        <Heading
          className={s.heading}
          subtitle="How it works"
          paragraph="Go from idea to execution faster with AI workflows designed for real product, growth, and security work."
        >
          Built to ship
          <br /> not just prototype
        </Heading>
        <div className={s.list}>
          {FEATURES.map((feature) => (
            <div className={s.item} key={feature.title} data-reveal>
              <Image src={feature.img} alt={feature.title} width={1314} height={1046} quality={100} draggable={false} />
              <div className={s.content}>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
      </Container>
    </section>
  )
}
