"use client"

import { Button } from "@/components/button"
import { TextField } from "@/components/text-field"
import { SurfacePanel } from "@/components/surface-panel"
import { changePassword } from "@/server/actions/password"
import { deleteAccount, updateProfile } from "@/server/actions/profile"
import { signOut, useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"
import s from "./profile-forms.module.scss"

export function EditNameForm({ currentName }: { currentName: string }) {
  const router = useRouter()
  const { update } = useSession()
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
    toast.success("Name updated")
    router.refresh()
  }

  return (
    <SurfacePanel title="Display name" subtitle="This is how your name appears across Kalit.">
      <form onSubmit={handleSubmit} className={s.row}>
        <div className={s.rowGrow}>
          <TextField
            id="display-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            required
            minLength={2}
          />
        </div>
        <Button type="submit" variant="secondary" disabled={loading || name === currentName}>
          {loading ? "Saving..." : "Save"}
        </Button>
      </form>
    </SurfacePanel>
  )
}

export function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match")
      return
    }

    setLoading(true)
    const result = await changePassword(currentPassword, newPassword)
    setLoading(false)

    if (result.error) {
      toast.error(result.error)
      return
    }

    toast.success("Password updated")
    setCurrentPassword("")
    setNewPassword("")
    setConfirmPassword("")
  }

  return (
    <SurfacePanel title="Change password" subtitle="Update the password you use to sign in.">
      <form onSubmit={handleSubmit} className={s.stack}>
        <TextField
          id="current-password"
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          placeholder="Current password"
          required
        />
        <TextField
          id="new-password"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="New password (min. 8 characters)"
          required
          minLength={8}
        />
        <TextField
          id="confirm-password"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Confirm new password"
          required
          minLength={8}
        />
        <div>
          <Button type="submit" variant="secondary" disabled={loading}>
            {loading ? "Updating..." : "Update"}
          </Button>
        </div>
      </form>
    </SurfacePanel>
  )
}

export function DeleteAccountForm() {
  const [confirmText, setConfirmText] = useState("")
  const [loading, setLoading] = useState(false)

  const handleDelete = async () => {
    if (confirmText !== "delete my account") return

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
      title="Delete account"
      subtitle="Permanently delete your account and all associated data. This action cannot be undone."
    >
      <div className={s.stack}>
        <p className={s.dangerHint}>
          Type <strong>delete my account</strong> to confirm.
        </p>
        <TextField
          id="delete-confirm"
          variant="danger"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder="delete my account"
        />
        <div>
          <button
            type="button"
            className={s.dangerButton}
            onClick={handleDelete}
            disabled={confirmText !== "delete my account" || loading}
          >
            {loading ? "Deleting..." : "Permanently delete account"}
          </button>
        </div>
      </div>
    </SurfacePanel>
  )
}
