"use client"

import { Button } from "@/components/button"
import { SurfacePanel } from "@/components/surface-panel"
import { TextField } from "@/components/text-field"
import { useTranslation } from "@/stores/i18n"
import { useState } from "react"
import { toast } from "sonner"
import s from "./contact.module.scss"

export function ContactForm() {
  const t = useTranslation()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !email.trim() || !message.trim()) {
      toast.error(t("contact.fillRequired"))
      return
    }

    setLoading(true)
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, subject, message })
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || "Something went wrong.")
      } else {
        toast.success(t("contact.messageSentToast"))
        setSent(true)
        setName("")
        setEmail("")
        setSubject("")
        setMessage("")
      }
    } catch {
      toast.error(t("contact.networkError"))
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <SurfacePanel spaced>
        <div className={s.success}>
          <div className={s.successIcon}>✓</div>
          <h3>{t("contact.messageSent")}</h3>
          <p>{t("contact.messageSentDesc")}</p>
          <Button variant="secondary" onClick={() => setSent(false)}>
            {t("contact.sendAnother")}
          </Button>
        </div>
      </SurfacePanel>
    )
  }

  return (
    <SurfacePanel spaced title={t("contact.sendMessage")}>
      <form onSubmit={handleSubmit} className={s.form}>
        <div className={s.formRow}>
          <TextField
            id="contact-name"
            placeholder={t("contact.yourName")}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <TextField
            id="contact-email"
            type="email"
            placeholder={t("contact.yourEmail")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <TextField
          id="contact-subject"
          placeholder={t("contact.subjectOptional")}
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
        />
        <div className={s.textareaWrap}>
          <textarea
            id="contact-message"
            placeholder={t("contact.yourMessage")}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            required
            rows={6}
            className={s.textarea}
          />
        </div>
        <Button type="submit" disabled={loading}>
          {loading ? t("contact.sending") : t("contact.sendBtn")}
        </Button>
      </form>
    </SurfacePanel>
  )
}
