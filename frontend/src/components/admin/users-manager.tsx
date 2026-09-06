"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, ChevronRight, Loader2, RefreshCcw, Search, Zap } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { UserAvatar } from "@/components/layout/user-avatar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { LoadingState } from "@/components/ui/loading"
import { ErrorBox } from "@/components/ui/error-box"
import { errorMessage } from "@/lib/errors"
import { formatDateDmy } from "@/lib/date-time"
import { cn } from "@/lib/utils"
import { getUsers } from "@/lib/api/admin"
import type { User } from "@/types"

const PAGE_SIZE = 10
const CACHE_TTL_MS = 10 * 60 * 1000

interface CachedUsers {
  users: User[]
  cachedAt: number
}

async function loadWithCache(): Promise<CachedUsers> {
  const cached = (globalThis as { __adminUsersCache?: CachedUsers }).__adminUsersCache
  const now = Date.now()
  if (cached && now - cached.cachedAt < CACHE_TTL_MS) {
    return cached
  }
  const users = await getUsers()
  const result: CachedUsers = { users, cachedAt: now }
  ;(globalThis as { __adminUsersCache?: CachedUsers }).__adminUsersCache = result
  return result
}

function clearUsersCache() {
  delete (globalThis as { __adminUsersCache?: CachedUsers }).__adminUsersCache
}

function UsersPagination({
  page,
  totalPages,
  onPageChange,
  className,
}: {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  className?: string
}) {
  return (
    <div className={cn("flex items-center gap-1", className)}>
      <Button
        variant="outline"
        size="icon-sm"
        onClick={() => onPageChange(Math.max(1, page - 1))}
        disabled={page <= 1}
        aria-label="Previous page"
      >
        <ChevronLeft className="size-3.5" />
      </Button>
      <span className="px-2 text-sm text-muted-foreground tabular-nums">
        {page} / {totalPages}
      </span>
      <Button
        variant="outline"
        size="icon-sm"
        onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        disabled={page >= totalPages}
        aria-label="Next page"
      >
        <ChevronRight className="size-3.5" />
      </Button>
    </div>
  )
}

export function UsersManager() {
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")
  const [verifiedFilter, setVerifiedFilter] = useState("all")
  const [page, setPage] = useState(1)

  const loadUsers = useCallback((bypassCache: boolean) => {
    if (bypassCache) clearUsersCache()
    return loadWithCache()
      .then(({ users }) => setUsers(users))
      .catch((err) => setLoadError(errorMessage(err)))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    loadUsers(false)
  }, [loadUsers])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return users.filter((u) => {
      if (q && !u.name.toLowerCase().includes(q) && !u.email.toLowerCase().includes(q)) {
        return false
      }
      if (roleFilter === "admin" && !u.admin && !u.superadmin) return false
      if (roleFilter === "superadmin" && !u.superadmin) return false
      if (roleFilter === "user" && (u.admin || u.superadmin)) return false
      if (verifiedFilter === "verified" && !u.email_verified) return false
      if (verifiedFilter === "unverified" && u.email_verified) return false
      return true
    })
  }, [users, query, roleFilter, verifiedFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-64 flex-1 items-center gap-2">
          <div className="relative w-full max-w-xs">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value)
                setPage(1)
              }}
              placeholder="Search by name or email..."
              className="h-9 pl-8"
            />
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => {
              setLoading(true)
              setLoadError(null)
              loadUsers(true)
            }}
            disabled={loading}
            className="text-muted-foreground hover:bg-foreground/10!"
            aria-label="Refresh users"
          >
            {loading ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <RefreshCcw className="size-3.5" />
            )}
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={roleFilter}
            onValueChange={(value) => {
              setRoleFilter(String(value))
              setPage(1)
            }}
          >
            <SelectTrigger className="h-9 w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All roles</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="superadmin">Superadmin</SelectItem>
              <SelectItem value="user">User</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={verifiedFilter}
            onValueChange={(value) => {
              setVerifiedFilter(String(value))
              setPage(1)
            }}
          >
            <SelectTrigger className="h-9 w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any verification</SelectItem>
              <SelectItem value="verified">Email verified</SelectItem>
              <SelectItem value="unverified">Email not verified</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {!loading && filtered.length > PAGE_SIZE && (
          <UsersPagination page={safePage} totalPages={totalPages} onPageChange={setPage} />
        )}
      </div>

      {loading ? (
        <LoadingState className="rounded-lg border border-border py-16" />
      ) : loadError ? (
        <ErrorBox>{loadError}</ErrorBox>
      ) : (
        <div className="rounded-lg border border-border bg-background">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Verified</TableHead>
                <TableHead className="text-right">Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paged.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-12 text-center text-sm text-muted-foreground">
                    No users found.
                  </TableCell>
                </TableRow>
              ) : (
                paged.map((user) => (
                  <TableRow
                    key={user.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/admin/users/${user.id}`)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <UserAvatar user={user} size="sm" />
                        {user.name}
                        {(user.admin || user.superadmin) && (
                          <span
                            className="inline-flex items-center gap-0.5 text-yellow-300"
                            title={user.superadmin ? "Superadmin" : "Admin"}
                          >
                            <Zap className="size-3.5 fill-current" />
                          </span>
                        )}
                      </div>
                    </TableCell>
<TableCell className="text-muted-foreground">{user.email}</TableCell>
<TableCell>
  <Badge variant={user.email_verified ? "secondary" : "outline"}>
    {user.email_verified ? "Verified" : "Unverified"}
  </Badge>
</TableCell>
<TableCell className="text-right text-muted-foreground">
  {formatDateDmy(user.created_at)}
</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {!loading && filtered.length > PAGE_SIZE && (
        <UsersPagination
          page={safePage}
          totalPages={totalPages}
          onPageChange={setPage}
          className="justify-end"
        />
      )}
    </section>
  )
}