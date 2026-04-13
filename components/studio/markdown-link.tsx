import type { AnchorHTMLAttributes } from "react"

// Render external links with target="_blank" so users don't lose their
// studio session when they click a deployed-site URL in the assistant's reply.
export function MarkdownLink(
  props: AnchorHTMLAttributes<HTMLAnchorElement>,
) {
  const { href = "", children, ...rest } = props
  const isExternal = /^https?:\/\//i.test(href)
  if (!isExternal) {
    return (
      <a href={href} {...rest}>
        {children}
      </a>
    )
  }
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" {...rest}>
      {children}
    </a>
  )
}
