// Bare 404 — no Wrapper/Header dependency. The root app/not-found.tsx is
// rendered OUTSIDE the [locale] layout (i.e. no SessionProvider), so any
// component that calls useSession() (Header, EmailBanner, …) would throw
// "Cannot destructure property 'data' of useSession()". Keep this page
// stripped to plain elements; the locale-aware not-found at
// app/[locale]/not-found.tsx still has the full chrome for in-app 404s.
export default function NotFound() {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          background: "#0b0b10",
          color: "#e7e7ea",
        }}
      >
        <main style={{ textAlign: "center", padding: "2rem", maxWidth: 480 }}>
          <h1 style={{ fontSize: "5rem", margin: "0 0 1rem", lineHeight: 1 }}>404</h1>
          <p style={{ fontSize: "1.05rem", margin: "0 0 2rem", color: "#a1a1aa" }}>
            This page doesn&apos;t exist. It may have been moved, or the URL might be incorrect.
          </p>
          <a
            href="/"
            style={{
              display: "inline-block",
              padding: "0.75rem 1.5rem",
              borderRadius: 8,
              background: "#8200DF",
              color: "white",
              textDecoration: "none",
              fontWeight: 500,
            }}
          >
            Back to home
          </a>
        </main>
      </body>
    </html>
  )
}
