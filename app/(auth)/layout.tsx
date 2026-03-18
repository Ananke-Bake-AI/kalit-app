import s from "./auth.module.scss"

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={s.page}>
      <div className={s.wrapper}>
        <div className={s.header}>
          <h1>Kalit AI</h1>
          <p>Build, launch, grow, and secure with AI</p>
        </div>
        {children}
      </div>
    </div>
  )
}
