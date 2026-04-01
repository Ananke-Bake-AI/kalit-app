import { Container } from "@/components/container"
import { Icon } from "@/components/icon"
import clsx from "clsx"
import { Metadata } from "next"
import Link from "next/link"
import { PageHeader } from "@/components/page-header"
import { PageSection } from "@/components/page-section"
import { SurfacePanel } from "@/components/surface-panel"
import legal from "@/components/legal-document/legal-document.module.scss"
import s from "./about.module.scss"

export const metadata: Metadata = {
  title: "About Us — Kalit AI",
  description:
    "Meet the team behind Kalit AI. Three co-founders from 42 Paris building the future of AI-powered product development, growth, and security.",
}

const FOUNDERS = [
  {
    name: "Frederick Jean Marinho",
    role: "Co-Founder & CEO",
    bio: "Software engineer from 42 Paris with deep expertise in blockchain infrastructure, decentralized systems, and full-stack development. Previously co-founded Helios Blockchain and managed Merkle Tech Capital. Passionate about bringing enterprise-grade AI tools to founders and digital teams.",
    linkedin: "https://www.linkedin.com/in/frederick-marinho/",
    skills: ["Full-Stack Development", "Blockchain", "AI Infrastructure", "Product Strategy"]
  },
  {
    name: "Jeremy Guyet",
    role: "Co-Founder & CTO",
    bio: "Software engineer from 42 Paris with extensive experience building production systems at scale. Former Full Stack Engineer at AXA and Canal+, co-founded Kryxivia (3D MMORPG) and Checkdot (decentralized insurance). Expert in distributed systems, DevOps, and Angular training at Ambient IT.",
    linkedin: "https://www.linkedin.com/in/jeremy-guyet/",
    skills: ["Distributed Systems", "DevOps", "Angular", "Blockchain", "Scala"]
  },
  {
    name: "Nicolas Martins",
    role: "Co-Founder & Lead Engineer",
    bio: "Senior software engineer from France with 6+ years as Lead Software Engineer at Cityscoot, where he built and scaled the entire backend infrastructure serving hundreds of thousands of users. Expert in Kubernetes, microservices architecture, and IoT systems. Deep experience with Go, Node.js, .NET Core, and cloud infrastructure on AWS.",
    linkedin: "https://www.linkedin.com/in/nicolas-martins/",
    skills: ["Kubernetes", "Microservices", "Go", "Node.js", "AWS", "IoT"]
  }
]

const VALUES = [
  {
    icon: "hugeicons:rocket-01",
    title: "Ship, don't just prototype",
    description: "We build tools that go from idea to production. Every feature is designed to deliver real outcomes, not demos."
  },
  {
    icon: "hugeicons:user-group",
    title: "Founders building for founders",
    description: "We've built startups, scaled products, and shipped code in production. We know what it takes because we've done it ourselves."
  },
  {
    icon: "hugeicons:globe-02",
    title: "AI as an execution layer",
    description: "We don't build another AI model. We orchestrate the best models into structured workflows that actually get work done."
  },
  {
    icon: "hugeicons:shield-01",
    title: "Trust and transparency",
    description: "Your data stays yours. We're a registered company with real people behind it. No black boxes, no hidden agendas."
  }
]

export default function AboutPage() {
  return (
    <PageSection>
      <Container>
        <PageHeader
          title="About Kalit"
          description="We're three engineers from 42 Paris who believe AI should do the heavy lifting — so founders can focus on what matters."
        />

        <article className={clsx(legal.surface, legal.narrow, legal.prose)}>
          <h2>Our mission</h2>
          <p>
            Kalit is the AI platform for startups and digital teams. We combine the best AI models — from OpenAI,
            Anthropic, and Google — into specialized suites that build apps, launch websites, run marketing campaigns,
            and secure products. One platform, zero overhead.
          </p>
          <p>
            We started Kalit because we were tired of stitching together dozens of tools to ship a product.
            As engineers and founders ourselves, we wanted a single platform where AI agents handle the execution
            — planning, coding, designing, testing, deploying — so teams can focus on vision and strategy.
          </p>

          <h2>The team</h2>
        </article>

        <div className={s.foundersGrid}>
          {FOUNDERS.map((founder) => (
            <SurfacePanel key={founder.name} spaced>
              <div className={s.founder}>
                <div className={s.founderHeader}>
                  <div className={s.founderAvatar}>
                    {founder.name.split(" ").map(n => n[0]).slice(0, 2).join("")}
                  </div>
                  <div>
                    <h3 className={s.founderName}>{founder.name}</h3>
                    <span className={s.founderRole}>{founder.role}</span>
                  </div>
                </div>
                <p className={s.founderBio}>{founder.bio}</p>
                <div className={s.founderSkills}>
                  {founder.skills.map((skill) => (
                    <span key={skill} className={s.skill}>{skill}</span>
                  ))}
                </div>
                <a href={founder.linkedin} target="_blank" rel="noopener noreferrer" className={s.linkedin}>
                  <Icon icon="hugeicons:linkedin-01" />
                  <span>LinkedIn</span>
                </a>
              </div>
            </SurfacePanel>
          ))}
        </div>

        <article className={clsx(legal.surface, legal.narrow, legal.prose)}>
          <h2>Our values</h2>
        </article>

        <div className={s.valuesGrid}>
          {VALUES.map((value) => (
            <div key={value.title} className={s.valueCard}>
              <div className={s.valueIcon}>
                <Icon icon={value.icon} />
              </div>
              <h3 className={s.valueTitle}>{value.title}</h3>
              <p className={s.valueDesc}>{value.description}</p>
            </div>
          ))}
        </div>

        <article className={clsx(legal.surface, legal.narrow, legal.prose)}>
          <h2>Company information</h2>
          <p>
            Kalit is operated by <strong>Merkle Tech Labs LTD.</strong>, a limited liability company
            registered in Malta.
          </p>
          <ul>
            <li><strong>Company name:</strong> Merkle Tech Labs LTD.</li>
            <li><strong>Registration number:</strong> C 107851</li>
            <li><strong>Date of registration:</strong> February 27, 2024</li>
            <li><strong>Registered office:</strong> Northlink Business Centre, Level 2, Triq Burmarrad, Naxxar, NXR 6345, Malta</li>
            <li><strong>Email:</strong> <a href="mailto:contact@kalit.ai">contact@kalit.ai</a></li>
          </ul>

          <h2>Where we come from</h2>
          <p>
            The three of us met through the tech and crypto ecosystem. We've built blockchain protocols,
            scaled SaaS platforms, led engineering teams, and shipped products used by hundreds of thousands of people.
            After years of building in Web3 and enterprise software, we saw AI as the next frontier — not just as a tool,
            but as an execution partner for builders.
          </p>
          <p>
            That's why we built Kalit: a platform where AI doesn't just answer questions — it builds your app,
            launches your site, runs your campaigns, and secures your product. All from a single prompt.
          </p>

          <h2>Contact us</h2>
          <p>
            Have questions, partnership inquiries, or press requests? Reach out to us:
          </p>
          <ul>
            <li><strong>General inquiries:</strong> <a href="mailto:contact@kalit.ai">contact@kalit.ai</a></li>
            <li><strong>Support:</strong> <Link href="/support">kalit.ai/support</Link></li>
            <li><strong>Social:</strong>{" "}
              <a href="https://x.com/kalit_ai" target="_blank" rel="noopener noreferrer">X (Twitter)</a>
              {" · "}
              <a href="https://www.linkedin.com/company/kalit-ai" target="_blank" rel="noopener noreferrer">LinkedIn</a>
              {" · "}
              <a href="https://discord.gg/kalit-ai" target="_blank" rel="noopener noreferrer">Discord</a>
            </li>
          </ul>

          <p className={s.address}>
            <strong>Merkle Tech Labs LTD.</strong><br />
            Northlink Business Centre, Level 2<br />
            Triq Burmarrad, Naxxar, NXR 6345<br />
            Malta
          </p>
        </article>
      </Container>
    </PageSection>
  )
}
