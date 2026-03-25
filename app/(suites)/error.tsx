"use client"

import Link from "next/link"

export default function HomeError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "60vh",
        padding: "2rem",
        textAlign: "center",
      }}
    >
      <h1
        style={{
          fontFamily: "var(--font-heading)",
          fontSize: "clamp(2rem, 5vw, 3.5rem)",
          color: "var(--text)",
          lineHeight: 1,
          marginBottom: "1rem",
        }}
      >
        Something went wrong
      </h1>
      <p
        style={{
          fontSize: "1.05rem",
          color: "var(--text-secondary)",
          maxWidth: "28rem",
          lineHeight: 1.65,
          marginBottom: "2rem",
        }}
      >
        An unexpected error occurred. Please try again, or return to the home page if the problem
        persists.
      </p>
      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", justifyContent: "center" }}>
        <button
          onClick={reset}
          style={{
            padding: "0.75rem 1.5rem",
            borderRadius: "0.75rem",
            border: "1px solid oklch(0 0 0 / 0.1)",
            background: "var(--text)",
            color: "var(--body)",
            fontFamily: "var(--font-heading)",
            fontSize: "0.95rem",
            cursor: "pointer",
          }}
        >
          Try again
        </button>
        <Link
          href="/"
          style={{
            padding: "0.75rem 1.5rem",
            borderRadius: "0.75rem",
            border: "1px solid oklch(0 0 0 / 0.1)",
            background: "transparent",
            color: "var(--text)",
            fontFamily: "var(--font-heading)",
            fontSize: "0.95rem",
            textDecoration: "none",
          }}
        >
          Go home
        </Link>
      </div>
    </div>
  )
}
