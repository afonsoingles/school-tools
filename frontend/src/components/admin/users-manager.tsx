"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Ban, Loader2, MailCheck, RefreshCcw, Search, ShieldCheck, Zap } from "lucide-react"

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
import { getAdminUsers } from "@/lib/api/admin"
import type { User } from "@/types"

const PAGE_SIZE = 50
const SEARCH_DEBOUNCE_MS = 300

const ROLE_LABELS: Record<string, string> = {
  all: "All",
  admin: "Admin",
  superadmin: "Superadmin",
  user: "User",
}

const VERIFIED_LABELS: Record<string, string> = {
  all: "Any",
  verified: "Yes",
  unverified: "No",
}

const STATUS_LABELS: Record<string, string> = {
  all: "All",
  active: "Active",
  banned: "Inactive",
}

function loadMoreUsers(
  offset: number
): Promise<{ users: User[]; total: number }> {
  return getAdminUsers({ limit: PAGE_SIZE, offset }).then((res) => ({
    users: res.users,
    total: res.total,
  }))
}

export function UsersManager() {
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")
  const [verifiedFilter, setVerifiedFilter] = useState("all")
  const [bannedFilter, setBannedFilter] = useState("all")
  const [reloadKey, setReloadKey] = useState(0)
  const debouncedRef = useRef("")
  const sentinelRef = useRef<HTMLTableRowElement | null>(null)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (debouncedRef.current !== query) {
        debouncedRef.current = query
        setLoading(true)
      }
      setDebouncedQuery(query)
    }, SEARCH_DEBOUNCE_MS)
    return () => window.clearTimeout(timer)
  }, [query])

  useEffect(() => {
    let cancelled = false

    getAdminUsers({
      limit: PAGE_SIZE,
      offset: 0,
      search: debouncedQuery.trim() || undefined,
      verified: verifiedFilter === "all" ? undefined : verifiedFilter === "verified",
      banned: bannedFilter === "all" ? undefined : bannedFilter === "banned",
      role: roleFilter === "all" ? undefined : (roleFilter as "admin" | "superadmin" | "user"),
    })
      .then((res) => {
        if (cancelled) return
        setUsers(res.users)
        setTotal(res.total)
        setLoadError(null)
      })
      .catch((err) => {
        if (!cancelled) setLoadError(errorMessage(err))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [debouncedQuery, roleFilter, verifiedFilter, bannedFilter, reloadKey])

  const hasMore = !loading && users.length > 0 && users.length < total

  const loadMore = useCallback(() => {
    if (loading || loadingMore || users.length >= total) return
    const offset = users.length
    setLoadingMore(true)
    loadMoreUsers(offset)
      .then((res) => {
        setUsers((prev) => {
          const known = new Set(prev.map((u) => u.id))
          const fresh = res.users.filter((u) => !known.has(u.id))
          return [...prev, ...fresh]
        })
        setTotal(res.total)
        setLoadError(null)
      })
      .catch((err) => setLoadError(errorMessage(err)))
      .finally(() => setLoadingMore(false))
  }, [loading, loadingMore, users.length, total])

  useEffect(() => {
    const el = sentinelRef.current
    if (!el || loading || !hasMore) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) loadMore()
        })
      },
      { root: null, rootMargin: "200px" }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasMore, loading, loadMore])

  function handleRefresh() {
    setLoadError(null)
    setLoading(true)
    setReloadKey((key) => key + 1)
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-64 flex-1 items-center gap-2">
          <div className="relative w-full max-w-xs">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by name or email..."
              className="h-9 pl-8"
            />
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleRefresh}
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
          {!loading && (
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              {total} {total === 1 ? "user" : "users"}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={roleFilter}
            onValueChange={(value) => {
              const next = String(value)
              if (next === roleFilter) return
              setRoleFilter(next)
              setLoading(true)
            }}
          >
            <SelectTrigger className="h-9 w-48">
              <span className="flex min-w-0 flex-1 items-center gap-1.5">
                <ShieldCheck className="size-3.5 shrink-0 text-muted-foreground" />
                <span className="text-muted-foreground">Role</span>
                <span className="select-none text-muted-foreground">·</span>
                <SelectValue className="truncate">
                  {(value) => ROLE_LABELS[String(value)] ?? ROLE_LABELS.all}
                </SelectValue>
              </span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="superadmin">Superadmin</SelectItem>
              <SelectItem value="user">User</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={verifiedFilter}
            onValueChange={(value) => {
              const next = String(value)
              if (next === verifiedFilter) return
              setVerifiedFilter(next)
              setLoading(true)
            }}
          >
            <SelectTrigger className="h-9 w-40">
              <span className="flex min-w-0 flex-1 items-center gap-1.5">
                <MailCheck className="size-3.5 shrink-0 text-muted-foreground" />
                <span className="text-muted-foreground">Verified</span>
                <span className="select-none text-muted-foreground">·</span>
                <SelectValue className="truncate">
                  {(value) => VERIFIED_LABELS[String(value)] ?? VERIFIED_LABELS.all}
                </SelectValue>
              </span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any</SelectItem>
              <SelectItem value="verified">Yes</SelectItem>
              <SelectItem value="unverified">No</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={bannedFilter}
            onValueChange={(value) => {
              const next = String(value)
              if (next === bannedFilter) return
              setBannedFilter(next)
              setLoading(true)
            }}
          >
            <SelectTrigger className="h-9 w-40">
              <span className="flex min-w-0 flex-1 items-center gap-1.5">
                <Ban className="size-3.5 shrink-0 text-muted-foreground" />
                <span className="text-muted-foreground">Status</span>
                <span className="select-none text-muted-foreground">·</span>
                <SelectValue className="truncate">
                  {(value) => STATUS_LABELS[String(value)] ?? STATUS_LABELS.all}
                </SelectValue>
              </span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="banned">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
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
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-12 text-center text-sm text-muted-foreground">
                    No users found.
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow
                    key={user.id}
                    className={cn(
                      "cursor-pointer",
                      !user.active && "bg-red-500/[0.06] hover:bg-red-500/10!"
                    )}
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
                      <Badge
                        variant={user.email_verified ? "secondary" : "outline"}
                        className={
                          user.email_verified
                            ? "border-green-300/40 bg-green-300/10 text-green-300 [a]:hover:bg-green-300/10"
                            : "border-red-400/40 bg-red-500/10 text-red-400 [a]:hover:bg-red-500/10"
                        }
                      >
                        {user.email_verified ? "Verified" : "Unverified"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatDateDmy(user.created_at)}
                    </TableCell>
                  </TableRow>
                ))
              )}

              {hasMore && (
                <TableRow ref={sentinelRef}>
                  <TableCell
                    colSpan={4}
                    className="py-4 text-center text-sm text-muted-foreground"
                  >
                    {loadingMore ? (
                      <Loader2 className="mx-auto size-4 animate-spin" />
                    ) : (
                      "Scroll for more"
                    )}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {hasMore && !loading && (
        <div className="flex justify-center">
          <Button variant="outline" className="gap-1.5" onClick={loadMore} disabled={loadingMore}>
            {loadingMore && <Loader2 className="size-4 animate-spin" />}
            Load more
          </Button>
        </div>
      )}
    </section>
  )
}