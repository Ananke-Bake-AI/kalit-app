import { Button } from "@/components/button"
import { Container } from "@/components/container"
import { Wrapper } from "@/components/layout/wrapper"

export default function NotFound() {
  return (
    <Wrapper>
      <section style={{ padding: "clamp(4rem, 10vw, 8rem) 0", textAlign: "center" }}>
        <Container>
          <h1
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: "clamp(4rem, 10vw, 8rem)",
              color: "var(--text)",
              lineHeight: 1,
              marginBottom: "1rem",
            }}
          >
            404
          </h1>
          <p
            style={{
              fontSize: "1.1rem",
              color: "var(--text-secondary)",
              marginBottom: "2rem",
              maxWidth: "28rem",
              marginInline: "auto",
            }}
          >
            This page doesn&apos;t exist. It may have been moved, or the URL might be incorrect.
          </p>
          <Button href="/">Back to home</Button>
        </Container>
      </section>
    </Wrapper>
  )
}
