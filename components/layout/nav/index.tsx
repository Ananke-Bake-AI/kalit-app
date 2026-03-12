import { Illustration } from "@/components/illustration"
import { Link } from "@/components/link"
import { SUITES } from "@/lib/suites"
import s from "./nav.module.scss"

export const Nav = () => {
  return (
    <nav className={s.nav}>
      <ul>
        <li className={s.subnav}>
          <span className={s.link}>Suites</span>
          <ul className={s.sub}>
            {SUITES.map(({ id, title, color }) => (
              <li key={id} style={{ "--color": color } as React.CSSProperties}>
                <Link href={`/${id}`}>
                  <Illustration suite={id} />
                  <span className={s.title}>
                    <strong>{title}</strong>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </li>
        <li>
          <Link href="/" className={s.link}>
            How it works
          </Link>
        </li>
        <li>
          <Link href="/" className={s.link}>
            Try now
          </Link>
        </li>
        <li>
          <Link href="/" className={s.link}>
            Why Kalit?
          </Link>
        </li>
      </ul>
    </nav>
  )
}
