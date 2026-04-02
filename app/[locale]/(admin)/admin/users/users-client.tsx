"use client"

import { Badge } from "@/components/badge"
import { Button } from "@/components/button"
import { Icon } from "@/components/icon"
import { SurfacePanel } from "@/components/surface-panel"
import { TextField } from "@/components/text-field"
import { deleteUser, getAdminUsers, toggleAdmin, updateUserRole } from "@/server/actions/admin"
import type { MembershipRole } from "@prisma/client"
import { useCallback, useState, useTransition } from "react"
import { toast } from "sonner"
import s from "./users.module.scss"

type UserData = Awaited<ReturnType<typeof getAdminUsers>>

const ROLES: MembershipRole[] = ["OWNER", "ADMIN", "MEMBER", "VIEWER"]

export function UsersClient({ initialData }: { initialData: UserData }) {
  const [data, setData] = useState(initialData)
  const [search, setSearch] = useState("")
  const [isPending, startTransition] = useTransition()

  const refresh = useCallback(
    (params: { search?: string; page?: number }) => {
      startTransition(async () => {
        const result = await getAdminUsers({ search: params.search, page: params.page, limit: 30 })
        setData(result)
      })
    },
    []
  )

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value)
    refresh({ search: e.target.value, page: 1 })
  }

  const handleRoleChange = async (userId: string, orgId: string, role: MembershipRole) => {
    const result = await updateUserRole(userId, orgId, role)
    if ("error" in result) {
      toast.error(result.error as string)
    } else {
      toast.success("Role updated")
      refresh({ search, page: data.page })
    }
  }

  const handleToggleAdmin = async (userId: string, currentValue: boolean) => {
    const action = currentValue ? "remove admin from" : "grant admin to"
    if (!confirm(`${action} this user?`)) return
    const result = await toggleAdmin(userId, !currentValue)
    if ("error" in result) {
      toast.error(result.error as string)
    } else {
      toast.success(currentValue ? "Admin access removed" : "Admin access granted")
      refresh({ search, page: data.page })
    }
  }

  const handleDelete = async (userId: string, name: string) => {
    if (!confirm(`Delete user "${name}"? This cannot be undone.`)) return
    const result = await deleteUser(userId)
    if ("error" in result) {
      toast.error(result.error as string)
    } else {
      toast.success("User deleted")
      refresh({ search, page: data.page })
    }
  }

  return (
    <>
      <SurfacePanel
        spaced
        title="User Management"
        subtitle={`${data.total} user${data.total !== 1 ? "s" : ""} registered`}
        headerAside={
          <TextField
            placeholder="Search by name or email..."
            value={search}
            onChange={handleSearch}
            className={s.search}
          />
        }
      >
        <div className={s.table}>
          <div className={s.tableHeader}>
            <span>User</span>
            <span>Email</span>
            <span>Organization</span>
            <span>Role</span>
            <span>Admin</span>
            <span>Joined</span>
            <span></span>
          </div>

          {data.users.map((user) => (
            <div key={user.id} className={s.tableRow}>
              <span className={s.name}>{user.name || "—"}</span>
              <span className={s.email}>{user.email}</span>
              <span className={s.org}>
                {user.memberships.map((m) => m.org.name).join(", ") || "—"}
              </span>
              <span>
                {user.memberships.map((m) => (
                  <select
                    key={m.id}
                    value={m.role}
                    onChange={(e) => handleRoleChange(user.id, m.orgId, e.target.value as MembershipRole)}
                    className={s.roleSelect}
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                ))}
                {user.memberships.length === 0 && <Badge>No org</Badge>}
              </span>
              <span>
                <button
                  type="button"
                  className={user.isAdmin ? s.adminBadgeActive : s.adminBadge}
                  onClick={() => handleToggleAdmin(user.id, user.isAdmin)}
                  title={user.isAdmin ? "Remove admin" : "Grant admin"}
                >
                  {user.isAdmin ? "ADMIN" : "—"}
                </button>
              </span>
              <span className={s.date}>{user.createdAt.toLocaleDateString()}</span>
              <span className={s.actions}>
                <button
                  type="button"
                  className={s.deleteBtn}
                  onClick={() => handleDelete(user.id, user.name || user.email)}
                  title="Delete user"
                >
                  <Icon icon="hugeicons:delete-02" />
                </button>
              </span>
            </div>
          ))}

          {data.users.length === 0 && (
            <div className={s.empty}>No users found.</div>
          )}
        </div>
      </SurfacePanel>

      {data.totalPages > 1 && (
        <div className={s.pagination}>
          <Button
            variant="secondary"
            disabled={data.page <= 1 || isPending}
            onClick={() => refresh({ search, page: data.page - 1 })}
          >
            Previous
          </Button>
          <span className={s.pageInfo}>
            Page {data.page} of {data.totalPages}
          </span>
          <Button
            variant="secondary"
            disabled={data.page >= data.totalPages || isPending}
            onClick={() => refresh({ search, page: data.page + 1 })}
          >
            Next
          </Button>
        </div>
      )}
    </>
  )
}
