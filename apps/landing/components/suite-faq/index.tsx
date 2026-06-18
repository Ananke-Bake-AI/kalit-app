import { Container } from "@/components/container"
import type { FaqItem } from "@/lib/suite-faq"
import s from "./suite-faq.module.scss"

interface SuiteFaqProps {
  items: FaqItem[]
  title?: string
}

/**
 * Visible FAQ accordion + matching FAQPage JSON-LD (rich results / AEO).
 * Native <details> so it works without JS.
 */
export const SuiteFaq = ({ items, title = "Frequently asked questions" }: SuiteFaqProps) => {
  if (!items?.length) return null

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((it) => ({
      "@type": "Question",
      name: it.q,
      acceptedAnswer: { "@type": "Answer", text: it.a }
    }))
  }

  return (
    <section className={s.faq}>
      <Container>
        <h2 className={s.title}>{title}</h2>
        <div className={s.list}>
          {items.map((it, i) => (
            <details key={i} className={s.item}>
              <summary className={s.q}>{it.q}</summary>
              <p className={s.a}>{it.a}</p>
            </details>
          ))}
        </div>
      </Container>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </section>
  )
}
