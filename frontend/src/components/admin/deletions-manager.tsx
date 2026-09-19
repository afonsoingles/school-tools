"use client"

import { useCallback, useEffect, useState } from "react"
import { useLocale } from "next-intl"
import { toast } from "sonner"
import { Check, Loader2, RefreshCcw, Sparkles, Undo2 } from "lucide-react"

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
import {
  approveDeletion,
  getAdminDeletions,
  reverseDeletion,
  runDailyPurge,
} from "@/lib/api/admin"
import type { DeletionRequest, DeletionStatus } from "@/types"

const STATUS_LABELS: Record<string, string> = {
  all: "All statuses",
  pending: "Pending",
  approved: "Approved",
  reversed: "Reversed",
  completed: "Completed",
}

const STATUS_VARIANTS: Record<DeletionStatus, "secondary" | "destructive" | "outline"> = {
  pending: "secondary",
  approved: "destructive",
  reversed: "outline",
  completed: "outline",
}

function formatDate(iso: string | null, locale: string): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" })
}

export function DeletionsManager({ isSuperadmin }: { isSuperadmin: boolean }) {
  const locale = useLocale()
  const [requests, setRequests] = useState<DeletionRequest[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState("all")
  const [reloadKey, setReloadKey] = useState(0)
  const [actingId, setActingId] = useState<string | null>(null)
  const [running, setRunning] = useState(false)

  const fetchRequests = useCallback(() => {
    return getAdminDeletions({
      limit: 100,
      status: statusFilter === "all" ? undefined : (statusFilter as DeletionStatus),
    })
      .then((res) => {
        setRequests(res.requests)
        setTotal(res.total)
        setLoadError(null)
      })
      .catch((err) => setLoadError(errorMessage(err)))
  }, [statusFilter])

  useEffect(() => {
    let cancelled = false
    fetchRequests().finally(() => {
      if (!cancelled) setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [fetchRequests, reloadKey])

  async function runAction(
    id: string,
    action: () => Promise<DeletionRequest>,
    success: string,
    hideOnSuccess = false
  ) {
    setActingId(id)
    try {
      await action()
      toast.success(success)
      if (hideOnSuccess) {
        setRequests((prev) => prev.filter((r) => r.id !== id))
        setTotal((prev) => Math.max(0, prev - 1))
      } else {
        await fetchRequests()
      }
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setActingId(null)
    }
  }

  async function handleRunPurges() {
    setRunning(true)
    try {
      const purged = await runDailyPurge()
      toast.success(
        purged === 0
          ? "No approved requests to purge."
          : `Purged ${purged} account(s) immediately.`
      )
      await fetchRequests()
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setRunning(false)
    }
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => {
              setLoading(true)
              setReloadKey((k) => k + 1)
            }}
            disabled={loading}
            className="text-muted-foreground hover:bg-foreground/10!"
            aria-label="Refresh deletion requests"
          >
            {loading ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCcw className="size-3.5" />}
          </Button>
          {!loading && (
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              {total} {total === 1 ? "request" : "requests"}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={statusFilter}
            onValueChange={(value) => {
              const next = String(value)
              if (next === statusFilter) return
              setStatusFilter(next)
              setLoading(true)
            }}
          >
            <SelectTrigger className="h-9 w-40">
              <SelectValue className="truncate">
                {(value) => STATUS_LABELS[String(value)] ?? STATUS_LABELS.all}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {isSuperadmin && (
            <Button variant="outline" className="gap-1.5" onClick={handleRunPurges} disabled={running}>
              {running ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-3.5" />}
              Run purges now
            </Button>
          )}
        </div>
      </div>

      {isSuperadmin && (
        <p className="text-xs text-muted-foreground">
          Approved requests are purged automatically by the daily cron job at 00:00. Run purges now
          (superadmin only) to purge every approved request immediately, skipping the grace period.
        </p>
      )}

      {loadError && <ErrorBox>{loadError}</ErrorBox>}

      <div className="rounded-lg border border-border bg-background">
        {loading ? (
          <LoadingState />
        ) : requests.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">No deletion requests found.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Requested</TableHead>
                  <TableHead>Purge</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{request.name}</span>
                        <span className="text-xs text-muted-foreground">{request.email}</span>
                        {request.nominated && (
                          <span className="text-xs text-muted-foreground italic">nominated</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANTS[request.status]}>{request.status}</Badge>
                    </TableCell>
                    <TableCell className="max-w-xs text-xs text-muted-foreground">
                      <span className="line-clamp-2">{request.reason || "—"}</span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDate(request.requested_at, locale)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {request.status === "completed"
                        ? formatDate(request.completed_at, locale)
                        : request.status === "approved"
                          ? "Next cron (00:00)"
                          : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1.5">
                        {actingId === request.id ? (
                          <Loader2 className="size-4 animate-spin text-muted-foreground" />
                        ) : request.status === "pending" ? (
                          <>
                            <Button
                              size="sm"
                              className="gap-1.5"
                              onClick={() =>
                                runAction(
                                  request.id,
                                  () => approveDeletion(request.id),
                                  "Deletion request approved. It will be purged by the next daily cron (00:00).",
                                  true
                                )
                              }
                            >
                              <Check className="size-3.5" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="gap-1.5"
                              onClick={() =>
                                runAction(
                                  request.id,
                                  () => reverseDeletion(request.id),
                                  "Deletion request reversed.",
                                  true
                                )
                              }
                            >
                              <Undo2 className="size-3.5" />
                              Reverse
                            </Button>
                          </>
                        ) : request.status === "approved" ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="gap-1.5"
                            onClick={() =>
                              runAction(
                                request.id,
                                () => reverseDeletion(request.id),
                                "Deletion request reversed.",
                                true
                              )
                            }
                          >
                            <Undo2 className="size-3.5" />
                            Reverse
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </section>
  )
}