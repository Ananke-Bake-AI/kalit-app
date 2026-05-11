import { Container } from "@/components/container"
import { Icon } from "@/components/icon"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { localeHref } from "@/lib/i18n-server"
import clsx from "clsx"
import s from "../../auth.module.scss"
import v from "../../verify-email/verify.module.scss"
import { AcceptInviteButton } from "./accept-button"

interface Props {
  params: Promise<{ id: string }>
}

export default async function InvitePage({ params }: Props) {
  const { id } = await params
  const [session, invitation] = await Promise.all([
    auth(),
    prisma.invitation.findUnique({
      where: { id },
      include: {
        org: { select: { name: true, slug: true } },
      },
    }),
  ])

  if (!invitation) {
    return (
      <ResultCard
        kind="error"
        title="Invitation not found"
        body="This link is invalid or the invitation was deleted."
      />
    )
  }

  const expired = invitation.expiresAt.getTime() < Date.now()

  if (invitation.status === "REVOKED") {
    return (
      <ResultCard
        kind="error"
        title="Invitation revoked"
        body="The owner of this organization has revoked this invitation. Ask them to send a new one."
      />
    )
  }
  if (invitation.status === "ACCEPTED") {
    return (
      <ResultCard
        kind="success"
        title="Already accepted"
        body={`You're already a member of ${invitation.org.name}.`}
        ctaHref="/studio"
        ctaLabel="Go to studio"
      />
    )
  }
  if (invitation.status === "EXPIRED" || expired) {
    return (
      <ResultCard
        kind="error"
        title="Invitation expired"
        body={`This invitation expired on ${invitation.expiresAt.toLocaleDateString()}. Ask ${invitation.org.name} to send a new one.`}
      />
    )
  }

  // Not signed in — push to login with a return-to back here.
  if (!session?.user?.email) {
    const loginHref = await localeHref(`/login?next=${encodeURIComponent(`/invite/${id}`)}`)
    const registerHref = await localeHref(
      `/register?next=${encodeURIComponent(`/invite/${id}`)}&email=${encodeURIComponent(invitation.email)}`,
    )
    return (
      <ResultCard
        kind="info"
        title={`You're invited to ${invitation.org.name}`}
        body={`Sign in with ${invitation.email} to accept this invitation.`}
        ctaHref={loginHref}
        ctaLabel="Sign in"
        secondaryHref={registerHref}
        secondaryLabel="Create an account"
      />
    )
  }

  // Wrong account — surface the mismatch loudly.
  if (session.user.email.toLowerCase() !== invitation.email.toLowerCase()) {
    const loginHref = await localeHref(`/login?next=${encodeURIComponent(`/invite/${id}`)}`)
    return (
      <ResultCard
        kind="error"
        title="Wrong account"
        body={`This invitation was sent to ${invitation.email}. You're signed in as ${session.user.email}. Sign out and sign back in with the invited address.`}
        ctaHref={loginHref}
        ctaLabel="Switch account"
      />
    )
  }

  // Happy path — show the accept button.
  return (
    <section className={s.page}>
      <Container>
        <div className={s.narrow}>
          <div className={clsx(s.card, s.cardCentered)}>
            <div className={v.result}>
              <div className={v.iconSuccess}>
                <Icon icon="hugeicons:user-add-02" />
              </div>
              <h1 className={v.title}>Join {invitation.org.name}</h1>
              <p className={v.text}>
                You've been invited as a <strong>{invitation.role.toLowerCase()}</strong>. Click below to add this organization to your account.
              </p>
              <AcceptInviteButton invitationId={invitation.id} orgSlug={invitation.org.slug} />
            </div>
          </div>
        </div>
      </Container>
    </section>
  )
}

function ResultCard({
  kind,
  title,
  body,
  ctaHref,
  ctaLabel,
  secondaryHref,
  secondaryLabel,
}: {
  kind: "success" | "error" | "info"
  title: string
  body: string
  ctaHref?: string
  ctaLabel?: string
  secondaryHref?: string
  secondaryLabel?: string
}) {
  const icon =
    kind === "success"
      ? "hugeicons:checkmark-circle-03"
      : kind === "error"
        ? "hugeicons:alert-circle"
        : "hugeicons:user-add-02"
  const iconClass = kind === "error" ? v.iconError : v.iconSuccess
  return (
    <section className={s.page}>
      <Container>
        <div className={s.narrow}>
          <div className={clsx(s.card, s.cardCentered)}>
            <div className={v.result}>
              <div className={iconClass}>
                <Icon icon={icon} />
              </div>
              <h1 className={v.title}>{title}</h1>
              <p className={v.text}>{body}</p>
              {ctaHref && ctaLabel && (
                <a
                  href={ctaHref}
                  style={{
                    display: "inline-block",
                    padding: "0.6rem 1.2rem",
                    borderRadius: "var(--radius-4)",
                    background: "var(--color-2)",
                    color: "white",
                    textDecoration: "none",
                    marginTop: "1rem",
                  }}
                >
                  {ctaLabel}
                </a>
              )}
              {secondaryHref && secondaryLabel && (
                <a
                  href={secondaryHref}
                  style={{
                    display: "inline-block",
                    marginTop: "0.75rem",
                    color: "var(--text-secondary)",
                    textDecoration: "underline",
                    fontSize: "0.85rem",
                  }}
                >
                  {secondaryLabel}
                </a>
              )}
            </div>
          </div>
        </div>
      </Container>
    </section>
  )
}
