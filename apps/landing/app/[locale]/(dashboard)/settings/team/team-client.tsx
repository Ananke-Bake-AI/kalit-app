"use client"

import { Avatar } from "@/components/avatar"
import { Badge } from "@/components/badge"
import { Button } from "@/components/button"
import { EmptyPlaceholder } from "@/components/empty-placeholder"
import { SurfacePanel } from "@/components/surface-panel"
import {
  inviteMember,
  removeMember,
  resendInvitation,
  revokeInvitation,
} from "@/server/actions/team"
import { useState, useTransition } from "react"
import rows from "@/components/stacked-rows/stacked-rows.module.scss"
import s from "./team.module.scss"

type MemberRole = "OWNER" | "ADMIN" | "MEMBER" | "VIEWER"
type InvitationStatus = "PENDING" | "ACCEPTED" | "REVOKED" | "EXPIRED"

export interface TeamClientProps {
  currentUserId: string
  currentUserRole: MemberRole
  members: Array<{
    id: string
    role: MemberRole
    userId: string
    user: { name: string | null; email: string }
  }>
  invitations: Array<{
    id: string
    email: string
    role: MemberRole
    status: InvitationStatus
    expiresAt: string
  }>
  seatsLabel: string
  count: number
  seatsFull: boolean
  maxMembers: number
}

const ROLE_OPTIONS: { value: MemberRole; label: string }[] = [
  { value: "MEMBER", label: "Member" },
  { value: "ADMIN", label: "Admin" },
  { value: "VIEWER", label: "Viewer" },
]

export function TeamClient({
  currentUserId,
  currentUserRole,
  members,
  invitations,
  seatsLabel,
  count,
  seatsFull,
  maxMembers,
}: TeamClientProps) {
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<MemberRole>("MEMBER")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const canManage = currentUserRole === "OWNER" || currentUserRole === "ADMIN"

  const refresh = () => {
    // Server actions revalidate by virtue of the page being a Server
    // Component — the cleanest way to refresh is a hard reload, since
    // we don't have a router-level revalidate boundary set up here.
    window.location.reload()
  }

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    startTransition(async () => {
      const result = await inviteMember(email.trim(), role)
      if ("error" in result) {
        setError(result.error || "Action failed")
        return
      }
      setEmail("")
      setSuccess(`Invitation sent to ${email.trim().toLowerCase()}.`)
      refresh()
    })
  }

  const handleResend = (id: string) => {
    setError(null)
    setSuccess(null)
    startTransition(async () => {
      const result = await resendInvitation(id)
      if ("error" in result) setError(result.error || "Action failed")
      else setSuccess("Invitation re-sent.")
    })
  }

  const handleRevoke = (id: string) => {
    if (!confirm("Revoke this invitation?")) return
    setError(null)
    setSuccess(null)
    startTransition(async () => {
      const result = await revokeInvitation(id)
      if ("error" in result) setError(result.error || "Action failed")
      else refresh()
    })
  }

  const handleRemove = (userId: string, label: string) => {
    if (!confirm(`Remove ${label} from the organization?`)) return
    setError(null)
    setSuccess(null)
    startTransition(async () => {
      const result = await removeMember(userId)
      if ("error" in result) setError(result.error || "Action failed")
      else refresh()
    })
  }

  return (
    <SurfacePanel
      title="Team members"
      subtitle="Invite teammates and manage their access to this organization."
      headerAside={
        <div className={s.headerActions}>
          <Badge>
            {count} / {seatsLabel}
          </Badge>
        </div>
      }
    >
      {canManage && !seatsFull && (
        <>
          <form className={s.inviteForm} onSubmit={handleInvite}>
            <input
              type="email"
              required
              placeholder="teammate@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={pending}
            />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as MemberRole)}
              disabled={pending}
            >
              {ROLE_OPTIONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
            <Button type="submit" disabled={pending || !email.trim()}>
              {pending ? "Sending…" : "Invite"}
            </Button>
          </form>
          {error && <p className={s.inviteError}>{error}</p>}
          {success && <p className={s.inviteSuccess}>{success}</p>}
        </>
      )}
      {canManage && seatsFull && (
        <div className={s.seatsFull}>
          <strong>Seat limit reached.</strong>{" "}
          {maxMembers === 1
            ? "Your current plan only includes 1 seat."
            : `Your plan is capped at ${maxMembers} seats.`}{" "}
          Upgrade to invite teammates, or revoke a pending invitation below to free a seat.
          <a href="/pricing" className={s.seatsFullCta}>
            Upgrade plan →
          </a>
        </div>
      )}

      {/* ── Active members ── */}
      <h3 className={s.subhead}>Members</h3>
      {members.length === 0 ? (
        <EmptyPlaceholder
          title="No members"
          description="No one has joined this organization yet."
        />
      ) : (
        members.map((member) => {
          const isSelf = member.userId === currentUserId
          const canRemove =
            canManage && !isSelf && member.role !== "OWNER"
          const label = member.user.name || member.user.email
          return (
            <div key={member.id} className={rows.row}>
              <div className={s.memberLead}>
                <Avatar className={s.teamAvatar} name={label} />
                <div className={rows.main}>
                  <div className={rows.title}>
                    {label}
                    {isSelf ? " (you)" : ""}
                  </div>
                  <div className={rows.subtitle}>{member.user.email}</div>
                </div>
              </div>
              <span className={rows.meta}>{member.role}</span>
              {canRemove && (
                <div className={s.rowActions}>
                  <button
                    type="button"
                    className={s.danger}
                    onClick={() => handleRemove(member.userId, label)}
                    disabled={pending}
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>
          )
        })
      )}

      {/* ── Pending invitations ── */}
      {invitations.length > 0 && (
        <>
          <h3 className={s.subhead}>Pending invitations</h3>
          {invitations.map((inv) => {
            const expired = new Date(inv.expiresAt).getTime() < Date.now()
            const expiresLabel = expired
              ? "Expired"
              : `Expires ${new Date(inv.expiresAt).toLocaleDateString()}`
            return (
              <div key={inv.id} className={rows.row}>
                <div className={s.memberLead}>
                  <Avatar className={s.teamAvatar} name={inv.email} />
                  <div className={rows.main}>
                    <div className={rows.title}>{inv.email}</div>
                    <div className={rows.subtitle}>Invited as {inv.role.toLowerCase()}</div>
                  </div>
                </div>
                <div className={s.pendingMeta}>
                  <Badge>{expired ? "EXPIRED" : "PENDING"}</Badge>
                  <span>{expiresLabel}</span>
                </div>
                {canManage && (
                  <div className={s.rowActions}>
                    <button
                      type="button"
                      onClick={() => handleResend(inv.id)}
                      disabled={pending}
                    >
                      Resend
                    </button>
                    <button
                      type="button"
                      className={s.danger}
                      onClick={() => handleRevoke(inv.id)}
                      disabled={pending}
                    >
                      Revoke
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </>
      )}
    </SurfacePanel>
  )
}
