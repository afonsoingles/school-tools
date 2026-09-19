"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useLocale } from "next-intl"
import { Loader2, RefreshCcw } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
import { getAdminAudit } from "@/lib/api/admin"
import { formatDateDmy } from "@/lib/date-time"
import type { AuditLog } from "@/types"

const PAGE_SIZE = 50

const RESOURCE_LABELS: Record<string, string> = {
  all: "All",
  subject: "Subject",
  class: "Class",
  evaluation: "Evaluation",
  homework: "Homework",
  holiday: "Holiday",
  settings: "Settings",
  api_key: "API key",
  notification: "Notification",
  deletion: "Deletion",
  folha: "Folha",
  auth: "Auth",
  user: "User",
  push: "Push",
}

const VIA_LABELS: Record<string, string> = {
  all: "Any",
  web: "Web",
  api: "API",
}

export function AuditManager() {
  const locale = useLocale()
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [resourceFilter, setResourceFilter] = useState("all")
  const [viaFilter, setViaFilter] = useState("all")
  const [reloadKey, setReloadKey] = useState(0)
  const sentinelRef = useRef<HTMLTableRowElement | null>(null)

  const buildParams = useCallback(
    (offset: number) => ({
      limit: PAGE_SIZE,
      offset,
      resource: resourceFilter === "all" ? undefined : resourceFilter,
      via: viaFilter === "all" ? undefined : (viaFilter as "web" | "api"),
    }),
    [resourceFilter, viaFilter]
  )

  useEffect(() => {
    let cancelled = false
    getAdminAudit(buildParams(0))
      .then((res) => {
        if (cancelled) return
        setLogs(res.logs)
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
  }, [buildParams, reloadKey])

  const hasMore = !loading && logs.length > 0 && logs.length < total

  const loadMore = useCallback(() => {
    if (loading || loadingMore || logs.length >= total) return
    setLoadingMore(true)
    getAdminAudit(buildParams(logs.length))
      .then((res) => {
        setLogs((prev) => {
          const known = new Set(prev.map((l) => l.id))
          const fresh = res.logs.filter((l) => !known.has(l.id))
          return [...prev, ...fresh]
        })
        setTotal(res.total)
        setLoadError(null)
      })
      .catch((err) => setLoadError(errorMessage(err)))
      .finally(() => setLoadingMore(false))
  }, [loading, loadingMore, logs.length, total, buildParams])

  useEffect(() => {
    const el = sentinelRef.current
    if (!el || loading || !hasMore || loadingMore) return

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
  }, [hasMore, loading, loadingMore, loadMore])

  function handleRefresh() {
    setLoadError(null)
    setLoading(true)
    setReloadKey((key) => key + 1)
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleRefresh}
            disabled={loading}
            className="text-muted-foreground hover:bg-foreground/10!"
            aria-label="Refresh audit logs"
          >
            {loading ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCcw className="size-3.5" />}
          </Button>
          {!loading && (
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              {total} {total === 1 ? "log" : "logs"}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={resourceFilter}
            onValueChange={(value) => {
              const next = String(value)
              if (next === resourceFilter) return
              setResourceFilter(next)
              setLoading(true)
            }}
          >
            <SelectTrigger className="h-9 w-44">
              <SelectValue className="truncate">
                {(value) => RESOURCE_LABELS[String(value)] ?? RESOURCE_LABELS.all}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {Object.entries(RESOURCE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={viaFilter}
            onValueChange={(value) => {
              const next = String(value)
              if (next === viaFilter) return
              setViaFilter(next)
              setLoading(true)
            }}
          >
            <SelectTrigger className="h-9 w-32">
              <SelectValue className="truncate">
                {(value) => VIA_LABELS[String(value)] ?? VIA_LABELS.all}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {Object.entries(VIA_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {loadError && <ErrorBox>{loadError}</ErrorBox>}

      <div className="rounded-lg border border-border bg-background">
        {loading ? (
          <LoadingState />
        ) : logs.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">No audit logs found.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Resource</TableHead>
                  <TableHead>Summary</TableHead>
                  <TableHead>Via</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id} ref={log === logs[logs.length - 1] ? sentinelRef : undefined}>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDateDmy(log.created_at, locale)}
                    </TableCell>
                    <TableCell className="text-xs font-mono">{log.user_id.slice(0, 8)}</TableCell>
                    <TableCell className="text-xs">
                      <Badge variant="outline">{log.action}</Badge>
                    </TableCell>
                    <TableCell className="text-xs">{log.resource}</TableCell>
                    <TableCell className="max-w-md text-xs truncate">{log.summary}</TableCell>
                    <TableCell className="text-xs">
                      <Badge variant={log.via === "api" ? "secondary" : "outline"}>
                        {log.via}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {loadingMore && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center">
                      <Loader2 className="mx-auto size-4 animate-spin" />
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </section>
  )
}