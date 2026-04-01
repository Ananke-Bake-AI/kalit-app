"use client"

import { Button } from "@/components/button"
import { TextField } from "@/components/text-field"
import { SurfacePanel } from "@/components/surface-panel"
import { changePassword } from "@/server/actions/password"
import { deleteAccount, updateProfile } from "@/server/actions/profile"
import { useTranslation } from "@/stores/i18n"
import { signOut, useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"
import s from "./profile-forms.module.scss"

export function EditNameForm({ currentName }: { currentName: string }) {
  const router = useRouter()
  const { update } = useSession()
  const t = useTranslation()
  const [name, setName] = useState(currentName)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (name === currentName) return

    setLoading(true)
    const result = await updateProfile({ name })
    setLoading(false)

    if (result.error) {
      toast.error(result.error)
      return
    }

    await update({ name })
    toast.success(t("settingsPages.nameUpdated"))
    router.refresh()
  }

  return (
    <SurfacePanel title={t("settingsPages.displayName")} subtitle={t("settingsPages.displayNameDesc")}>
      <form onSubmit={handleSubmit} className={s.row}>
        <div className={s.rowGrow}>
          <TextField
            id="display-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("settingsPages.yourName")}
            required
            minLength={2}
          />
        </div>
        <Button type="submit" variant="secondary" disabled={loading || name === currentName}>
          {loading ? t("settingsPages.saving") : t("settingsPages.save")}
        </Button>
      </form>
    </SurfacePanel>
  )
}

export function ChangePasswordForm() {
  const t = useTranslation()
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (newPassword !== confirmPassword) {
      toast.error(t("settingsPages.passwordsNoMatch"))
      return
    }

    setLoading(true)
    const result = await changePassword(currentPassword, newPassword)
    setLoading(false)

    if (result.error) {
      toast.error(result.error)
      return
    }

    toast.success(t("settingsPages.passwordUpdated"))
    setCurrentPassword("")
    setNewPassword("")
    setConfirmPassword("")
  }

  return (
    <SurfacePanel title={t("settingsPages.changePassword")} subtitle={t("settingsPages.changePasswordDesc")}>
      <form onSubmit={handleSubmit} className={s.stack}>
        <TextField
          id="current-password"
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          placeholder={t("settingsPages.currentPassword")}
          required
        />
        <TextField
          id="new-password"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder={t("settingsPages.newPassword")}
          required
          minLength={8}
        />
        <TextField
          id="confirm-password"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder={t("settingsPages.confirmPassword")}
          required
          minLength={8}
        />
        <div>
          <Button type="submit" variant="secondary" disabled={loading}>
            {loading ? t("settingsPages.updating") : t("settingsPages.update")}
          </Button>
        </div>
      </form>
    </SurfacePanel>
  )
}

export function DeleteAccountForm() {
  const t = useTranslation()
  const [confirmText, setConfirmText] = useState("")
  const [loading, setLoading] = useState(false)
  const confirmString = t("settingsPages.deleteConfirmText")

  const handleDelete = async () => {
    if (confirmText !== confirmString) return

    setLoading(true)
    const result = await deleteAccount()
    setLoading(false)

    if (result.error) {
      toast.error(result.error)
      return
    }

    await signOut({ callbackUrl: "/" })
  }

  return (
    <SurfacePanel
      danger
      title={t("settingsPages.deleteAccount")}
      subtitle={t("settingsPages.deleteAccountDesc")}
    >
      <div className={s.stack}>
        <p className={s.dangerHint}>
          {t("settingsPages.deleteConfirmInstruction", { confirmText: confirmString })}
        </p>
        <TextField
          id="delete-confirm"
          variant="danger"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder={confirmString}
        />
        <div>
          <button
            type="button"
            className={s.dangerButton}
            onClick={handleDelete}
            disabled={confirmText !== confirmString || loading}
          >
            {loading ? t("settingsPages.deleting") : t("settingsPages.deleteButton")}
          </button>
        </div>
      </div>
    </SurfacePanel>
  )
}
