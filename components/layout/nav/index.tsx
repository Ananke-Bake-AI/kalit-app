import Link from "next/link"
import s from "./nav.module.scss"

export const Nav = () => {
  return (
    <nav className={s.nav}>
      <ul>
        <li>
          <Link href="/">How it works</Link>
        </li>
        <li>
          <Link href="/">Suites</Link>
        </li>
        <li>
          <Link href="/">Try now</Link>
        </li>
        <li>
          <Link href="/">Why Kalit?</Link>
        </li>
      </ul>
    </nav>
  )
}
