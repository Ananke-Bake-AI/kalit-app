"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { resolveEntitlements } from "@/lib/entitlements"
import { sendInvitationEmail } from "@/lib/email"
import type { MembershipRole } from "@prisma/client"

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000"

// requireSeatHolder ensures the caller has authority to manage members
// (OWNER or ADMIN). Returns the membership row for downstream use, or an
// error map ready to bubble back to the client.
async function requireSeatHolder() {
  const session = await auth()
  if (!session?.user?.id || !session.user.orgId) {
    return { error: "Not authenticated" } as const
  }
  const membership = await prisma.membership.findUnique({
    where: { userId_orgId: { userId: session.user.id, orgId: session.user.orgId } },
    include: { user: { select: { name: true, email: true } }, org: { select: { name: true } } },
  })
  if (!membership) return { error: "Not a member of this organization" } as const
  if (membership.role !== "OWNER" && membership.role !== "ADMIN") {
    return { error: "Only the owner or an admin can manage members" } as const
  }
  return { membership } as const
}

export async function inviteMember(email: string, role: MembershipRole = "MEMBER") {
  const ctx = await requireSeatHolder()
  if ("error" in ctx) return ctx
  const { membership } = ctx
  const orgId = membership.orgId

  email = email.trim().toLowerCase()
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Invalid email address" }
  }

  // Skip self-invites — they would silently fail at acceptance anyway.
  if (membership.user.email?.toLowerCase() === email) {
    return { error: "You can't invite yourself" }
  }

  // Already a member of this org? No-op (with a friendly message).
  const existingMember = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      memberships: { where: { orgId }, select: { id: true } },
    },
  })
  if (existingMember && existingMember.memberships.length > 0) {
    return { error: `${email} is already a member of this organization` }
  }

  // Seat gating: count active members + non-terminal invitations.
  const entitlements = await resolveEntitlements(orgId)
  if (entitlements.maxMembers !== -1) {
    const [memberCount, pendingCount] = await Promise.all([
      prisma.membership.count({ where: { orgId } }),
      prisma.invitation.count({
        where: { orgId, status: "PENDING", expiresAt: { gt: new Date() } },
      }),
    ])
    if (memberCount + pendingCount >= entitlements.maxMembers) {
      return {
        error: `Your plan allows ${entitlements.maxMembers} member${entitlements.maxMembers === 1 ? "" : "s"} (currently ${memberCount} active + ${pendingCount} pending). Upgrade or revoke a pending invite first.`,
      }
    }
  }

  const expiresAt = new Date(Date.now() + INVITE_TTL_MS)

  // upsert: re-invite refreshes the existing invitation row instead of
  // failing on the @@unique([email, orgId]) constraint.
  const invitation = await prisma.invitation.upsert({
    where: { email_orgId: { email, orgId } },
    update: { role, status: "PENDING", expiresAt },
    create: { email, role, status: "PENDING", expiresAt, orgId },
  })

  const inviterName = membership.user.name || membership.user.email || "A teammate"
  const inviteUrl = `${APP_URL}/invite/${invitation.id}`
  try {
    await sendInvitationEmail({
      to: email,
      orgName: membership.org.name,
      inviterName,
      inviteUrl,
      role,
    })
  } catch (err) {
    // Don't roll back the invitation row — admin can hit "resend" if the
    // mail provider hiccups. Surface the failure so the UI knows to ask.
    console.error("[team/inviteMember] sendInvitationEmail failed:", err)
    return {
      error: "Invitation saved but the email failed to send. Try Resend in the pending list.",
      invitationId: invitation.id,
    }
  }

  return { success: true, invitationId: invitation.id }
}

export async function resendInvitation(invitationId: string) {
  const ctx = await requireSeatHolder()
  if ("error" in ctx) return ctx
  const { membership } = ctx

  const invitation = await prisma.invitation.findUnique({ where: { id: invitationId } })
  if (!invitation || invitation.orgId !== membership.orgId) {
    return { error: "Invitation not found" }
  }
  if (invitation.status !== "PENDING") {
    return { error: `Cannot resend a ${invitation.status.toLowerCase()} invitation` }
  }

  // Refresh expiry so the link is usable for another full window.
  const expiresAt = new Date(Date.now() + INVITE_TTL_MS)
  await prisma.invitation.update({
    where: { id: invitationId },
    data: { expiresAt },
  })

  const inviterName = membership.user.name || membership.user.email || "A teammate"
  await sendInvitationEmail({
    to: invitation.email,
    orgName: membership.org.name,
    inviterName,
    inviteUrl: `${APP_URL}/invite/${invitation.id}`,
    role: invitation.role,
  })
  return { success: true }
}

export async function revokeInvitation(invitationId: string) {
  const ctx = await requireSeatHolder()
  if ("error" in ctx) return ctx
  const { membership } = ctx

  const invitation = await prisma.invitation.findUnique({ where: { id: invitationId } })
  if (!invitation || invitation.orgId !== membership.orgId) {
    return { error: "Invitation not found" }
  }
  await prisma.invitation.update({
    where: { id: invitationId },
    data: { status: "REVOKED" },
  })
  return { success: true }
}

export async function removeMember(userIdToRemove: string) {
  const ctx = await requireSeatHolder()
  if ("error" in ctx) return ctx
  const { membership } = ctx
  if (userIdToRemove === membership.userId) {
    return { error: "You can't remove yourself — transfer ownership or leave the org instead" }
  }
  const target = await prisma.membership.findUnique({
    where: { userId_orgId: { userId: userIdToRemove, orgId: membership.orgId } },
  })
  if (!target) return { error: "Member not found" }
  if (target.role === "OWNER") {
    return { error: "Owners cannot be removed" }
  }
  await prisma.membership.delete({
    where: { userId_orgId: { userId: userIdToRemove, orgId: membership.orgId } },
  })
  return { success: true }
}

// acceptInvitation is called from the /invite/[id] page once the user is
// signed in. Creates the Membership and flips the Invitation to ACCEPTED.
// Self-serve only — no privilege checks, but the invitation's email MUST
// match the signed-in user's email.
export async function acceptInvitation(invitationId: string) {
  const session = await auth()
  if (!session?.user?.id || !session.user.email) {
    return { error: "Sign in required" }
  }

  const invitation = await prisma.invitation.findUnique({
    where: { id: invitationId },
    include: { org: { select: { id: true, name: true, slug: true } } },
  })
  if (!invitation) return { error: "Invitation not found" }
  if (invitation.status !== "PENDING") {
    return { error: `This invitation is ${invitation.status.toLowerCase()}` }
  }
  if (invitation.expiresAt < new Date()) {
    await prisma.invitation.update({
      where: { id: invitationId },
      data: { status: "EXPIRED" },
    })
    return { error: "This invitation has expired" }
  }
  if (invitation.email.toLowerCase() !== session.user.email.toLowerCase()) {
    return { error: `This invitation was sent to ${invitation.email}. Sign in with that email to accept.` }
  }

  // Already a member? Treat as success (idempotent).
  const existingMembership = await prisma.membership.findUnique({
    where: { userId_orgId: { userId: session.user.id, orgId: invitation.orgId } },
  })
  if (!existingMembership) {
    await prisma.membership.create({
      data: {
        userId: session.user.id,
        orgId: invitation.orgId,
        role: invitation.role,
        isCurrent: false,
      },
    })
  }
  await prisma.invitation.update({
    where: { id: invitationId },
    data: { status: "ACCEPTED" },
  })

  return { success: true, orgId: invitation.org.id, orgName: invitation.org.name }
}
