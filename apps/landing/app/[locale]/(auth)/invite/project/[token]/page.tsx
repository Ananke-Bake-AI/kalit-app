import { Container } from "@/components/container"
import { Icon } from "@/components/icon"
import { auth } from "@/lib/auth"
import { localeHref } from "@/lib/i18n-server"
import clsx from "clsx"
import s from "../../../auth.module.scss"
import v from "../../../verify-email/verify.module.scss"
import { AcceptProjectButton } from "./accept-button"

interface Props {
  params: Promise<{ token: string; locale: string }>
}

// Page d'acceptation d'une invitation de projet (collaboration à plusieurs).
// On ne connaît pas les détails de l'invite avant de l'accepter (le broker les
// valide) : on affiche donc un écran de bienvenue + bouton. La validation fine
// (révoquée / expirée / mauvais e-mail) remonte comme erreur à l'accept.
export default async function ProjectInvitePage({ params }: Props) {
  const { token, locale } = await params
  const session = await auth()

  // Non connecté → login avec retour ici (register aussi, pour un nouveau venu).
  if (!session?.user?.email) {
    const next = `/invite/project/${token}`
    const loginHref = await localeHref(`/login?next=${encodeURIComponent(next)}`)
    const registerHref = await localeHref(`/register?next=${encodeURIComponent(next)}`)
    return (
      <section className={s.page}>
        <Container>
          <div className={s.narrow}>
            <div className={clsx(s.card, s.cardCentered)}>
              <div className={v.result}>
                <div className={v.iconSuccess}>
                  <Icon icon="hugeicons:user-add-02" />
                </div>
                <h1 className={v.title}>You&apos;re invited to collaborate</h1>
                <p className={v.text}>
                  Sign in to accept this invitation and open the shared project.
                </p>
                <a
                  href={loginHref}
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
                  Sign in
                </a>
                <a
                  href={registerHref}
                  style={{
                    display: "inline-block",
                    marginTop: "0.75rem",
                    color: "var(--text-secondary)",
                    textDecoration: "underline",
                    fontSize: "0.85rem",
                  }}
                >
                  Create an account
                </a>
              </div>
            </div>
          </div>
        </Container>
      </section>
    )
  }

  // Connecté → écran de bienvenue + bouton d'acceptation.
  return (
    <section className={s.page}>
      <Container>
        <div className={s.narrow}>
          <div className={clsx(s.card, s.cardCentered)}>
            <div className={v.result}>
              <div className={v.iconSuccess}>
                <Icon icon="hugeicons:user-add-02" />
              </div>
              <h1 className={v.title}>Join this project</h1>
              <p className={v.text}>
                You&apos;ve been invited to collaborate on a Kalit project. Accept to open
                it from your account.
              </p>
              <AcceptProjectButton token={token} locale={locale} />
            </div>
          </div>
        </div>
      </Container>
    </section>
  )
}
