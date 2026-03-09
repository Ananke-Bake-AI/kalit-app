import { Button } from "@/components/button"
import Link from "next/link"
import { Nav } from "../nav"
import s from "./header.module.scss"

export const Header = () => {
  return (
    <header className={s.header}>
      <div className={s.content}>
        <Link href="/" className={s.logo}>
          <svg viewBox="0 0 82 82">
            <path d="M71.878.065c0 17.053-13.824 30.878-30.878 30.878m30.878 51.034c0-17.053-13.824-30.878-30.878-30.878S10.122 64.924 10.122 81.977" />
            <path d="M10.122.023v81.954" />
          </svg>
          <span>kalit</span>
        </Link>
        <Nav />
        <Button className={s.btn}>Start my project</Button>
      </div>
    </header>
  )
}
