"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, ChevronRight, Loader2, RefreshCcw, Search, Zap } from "lucide-react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import { ApiError } from "@/lib/api/client"
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

function errorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    const body = err.body as { message?: string } | null
    return body?.message ?? "Something went wrong. Please try again."
  }
  return "Something went wrong. Please try again."
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
}

function formatDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
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
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
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

        <div className="flex items-center gap-2">
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
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage <= 1}
              aria-label="Previous page"
            >
              <ChevronLeft className="size-3.5" />
            </Button>
            <span className="px-2 text-sm text-muted-foreground tabular-nums">
              {safePage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
              aria-label="Next page"
            >
              <ChevronRight className="size-3.5" />
            </Button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center rounded-lg border border-border py-16 text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
        </div>
      ) : loadError ? (
        <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/25 rounded-md px-3 py-2">
          {loadError}
        </p>
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
                        <Avatar size="sm">
                          <AvatarFallback>{initials(user.name)}</AvatarFallback>
                        </Avatar>
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
  {formatDate(user.created_at)}
</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {!loading && filtered.length > PAGE_SIZE && (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={safePage <= 1}
            aria-label="Previous page"
          >
            <ChevronLeft className="size-3.5" />
          </Button>
          <span className="px-2 text-sm text-muted-foreground tabular-nums">
            {safePage} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage >= totalPages}
            aria-label="Next page"
          >
            <ChevronRight className="size-3.5" />
          </Button>
        </div>
      )}
    </section>
  )
}