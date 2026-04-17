import { useAuth } from "./auth-context"
import styles from "./sign-in-screen.module.scss"

export function SignInScreen() {
  const { signIn } = useAuth()

  return (
    <main className={styles.root}>
      <div className={styles.card}>
        <div className={styles.logo}>K</div>
        <h1 className={styles.title}>Welcome to Kalit Studio</h1>
        <p className={styles.subtitle}>
          Sign in with your Kalit account to start building.
        </p>
        <button type="button" className={styles.primary} onClick={signIn}>
          Sign in through kalit.ai
        </button>
        <p className={styles.hint}>
          A browser window will open. Sign in, and the app will connect
          automatically.
        </p>
      </div>
    </main>
  )
}
