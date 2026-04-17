"use client"

import { useEffect, useState } from "react"
import styles from "./redirect-client.module.scss"

export function DesktopAuthRedirect({
  deepLink,
  userEmail,
}: {
  deepLink: string
  userEmail: string
}) {
  const [triggered, setTriggered] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      window.location.href = deepLink
      setTriggered(true)
    }, 400)
    return () => clearTimeout(timer)
  }, [deepLink])

  return (
    <main className={styles.root}>
      <div className={styles.card}>
        <div className={styles.logo}>K</div>
        <h1 className={styles.title}>Opening Kalit Studio…</h1>
        <p className={styles.email}>Signed in as {userEmail}</p>
        <p className={styles.help}>
          If the app didn't open automatically, click the button below.
        </p>
        <a className={styles.button} href={deepLink}>
          Open Kalit Studio
        </a>
        {triggered && (
          <p className={styles.hint}>
            You can close this tab once the app opens.
          </p>
        )}
      </div>
    </main>
  )
}
