import { Button } from "@/components/button"
import s from "./footer.module.scss"

export const Newsletter = () => {
  return (
    <div className={s.newsletter}>
      <div className={s.left}>
        <h2>Get early access</h2>
        <p>Be the first to try Kalit. Enter your email for early access and product updates.</p>
      </div>
      <form className={s.form}>
        <input type="email" placeholder="Your email address" />
        <Button type="submit">Join waitlist</Button>
      </form>
    </div>
  )
}
