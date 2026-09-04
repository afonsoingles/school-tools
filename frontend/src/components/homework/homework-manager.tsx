"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowDown,
  ArrowUp,
  CalendarClock,
  Clock3,
  Eye,
  LayoutGrid,
  Loader2,
  Plus,
  Search,
  Trash2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
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
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { SubjectIcon } from "@/components/ui/subject-icon"
import { getSubjects } from "@/lib/api/settings"
import { getHomework } from "@/lib/api/homework"
import type { Homework, Subject } from "@/types"
import { HOMEWORK_STATUS_BADGE, HOMEWORK_STATUS_LABELS, HOMEWORK_STATUS_ORDER } from "./constants"
import { CreateHomeworkDialog } from "./create-homework-dialog"
import { DeleteHomeworkDialog } from "./delete-homework-dialog"

type SortKey = "due_date" | "title" | "subject" | "status"

function errorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    const body = err.body as { message?: string } | null
    return body?.message ?? "Something went wrong. Please try again."
  }
  return "Something went wrong. Please try again."
}

function isOverdue(hw: Homework, now: Date): boolean {
  if (hw.status === "finished") return false
  return new Date(hw.due_date).getTime() < now.getTime()
}

function isUpcoming(hw: Homework): boolean {
  if (hw.status === "finished") return false
  return true
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function HomeworkManager() {
  const [homeworks, setHomeworks] = useState<Homework[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [search, setSearch] = useState("")
  const [subjectFilter, setSubjectFilter] = useState("all")
  const [timeFilter, setTimeFilter] = useState<"all" | "upcoming" | "overdue">("upcoming")
  const [sortKey, setSortKey] = useState<SortKey>("due_date")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")

  const [createOpen, setCreateOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Homework | null>(null)

  const router = useRouter()

  const fetchData = () => {
    Promise.all([getHomework(), getSubjects()])
      .then(([hw, subs]) => {
        setHomeworks(hw)
        setSubjects(subs)
      })
      .catch((err) => setLoadError(errorMessage(err)))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchData() }, [])

  const subjectNameMap = useMemo(
    () => new Map(subjects.map((s) => [s.id, s.name])),
    [subjects]
  )
  const subjectIconMap = useMemo(
    () => new Map(subjects.map((s) => [s.id, s.icon])),
    [subjects]
  )

  const rows = useMemo(() => {
    const now = new Date()
    const q = search.trim().toLowerCase()

    const filtered = homeworks.filter((hw) => {
      if (q && !`${hw.title} ${hw.description}`.toLowerCase().includes(q)) return false
      if (subjectFilter !== "all" && hw.subject_id !== subjectFilter) return false
      if (timeFilter === "overdue" && !isOverdue(hw, now)) return false
      if (timeFilter === "upcoming" && !isUpcoming(hw)) return false
      return true
    })

    const mapped = filtered.map((hw) => ({
      homework: hw,
      subjectName: subjectNameMap.get(hw.subject_id) ?? "Unknown",
      subjectIcon: subjectIconMap.get(hw.subject_id) ?? "",
    }))

    mapped.sort((a, b) => {
      let cmp = 0
      if (sortKey === "due_date") {
        cmp = new Date(a.homework.due_date).getTime() - new Date(b.homework.due_date).getTime()
      } else if (sortKey === "title") {
        cmp = a.homework.title.localeCompare(b.homework.title)
      } else if (sortKey === "subject") {
        cmp = a.subjectName.localeCompare(b.subjectName)
      } else {
        cmp = HOMEWORK_STATUS_ORDER.indexOf(a.homework.status) - HOMEWORK_STATUS_ORDER.indexOf(b.homework.status)
      }
      return sortDir === "asc" ? cmp : -cmp
    })

    return mapped
  }, [homeworks, search, subjectFilter, timeFilter, sortKey, sortDir, subjectNameMap, subjectIconMap])

  const hasFilters =
    search.trim() !== "" ||
    subjectFilter !== "all" ||
    timeFilter !== "all"

  function clearFilters() {
    setSearch("")
    setSubjectFilter("all")
    setTimeFilter("all")
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
      </div>
    )
  }

  if (loadError) {
    return (
      <p className="px-3 py-2 text-sm text-red-400 border rounded-md bg-red-500/10 border-red-500/25">
        {loadError}
      </p>
    )
  }

  if (homeworks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-center rounded-lg">
        <p className="text-sm text-muted-foreground">You have no homework.</p>
        {subjects.length === 0 ? (
          <Button size="sm" disabled>
            Please create a subject before creating homework
          </Button>
        ) : (
          <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-1.5">
            <Plus className="size-3.5" />
            New homework
          </Button>
        )}

        <CreateHomeworkDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          subjects={subjects}
          onCreated={fetchData}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-muted-foreground">View</label>
          <div className="flex items-center gap-0.5 rounded-lg border border-border bg-muted p-0.5">
            <Button
              variant={timeFilter === "all" ? "default" : "ghost"}
              size="sm"
              onClick={() => setTimeFilter("all")}
              className={cn("gap-1.5 px-3", timeFilter !== "all" && "text-muted-foreground hover:text-foreground")}
            >
              <LayoutGrid className="size-3.5" />
              All
            </Button>
            <Button
              variant={timeFilter === "upcoming" ? "default" : "ghost"}
              size="sm"
              onClick={() => setTimeFilter("upcoming")}
              className={cn("gap-1.5 px-3", timeFilter !== "upcoming" && "text-muted-foreground hover:text-foreground")}
            >
              <Clock3 className="size-3.5" />
              Upcoming
            </Button>
            <Button
              variant={timeFilter === "overdue" ? "default" : "ghost"}
              size="sm"
              onClick={() => setTimeFilter("overdue")}
              className={cn("gap-1.5 px-3", timeFilter !== "overdue" && "text-muted-foreground hover:text-foreground")}
            >
              <CalendarClock className="size-3.5" />
              Overdue
            </Button>
          </div>
        </div>

        <div className="flex w-60 flex-col gap-1.5">
          <label className="text-xs font-medium text-muted-foreground">Search</label>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search title or description…"
              className="pl-8"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-muted-foreground">Subject</label>
          <Select value={subjectFilter} onValueChange={(v) => setSubjectFilter(String(v))}>
            <SelectTrigger className="w-40">
              {subjectFilter === "all" ? "All subjects" : subjectNameMap.get(subjectFilter) ?? "Unknown"}
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" label="All subjects">All subjects</SelectItem>
              {subjects.map((s) => (
                <SelectItem key={s.id} value={s.id} label={s.name}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-muted-foreground">Sort by</label>
          <div className="flex items-center gap-1.5">
            <Select
              value={sortKey}
              onValueChange={(v) => setSortKey(String(v) as SortKey)}
            >
              <SelectTrigger className="w-36">
                {sortKey === "due_date" ? "Due date" : sortKey === "title" ? "Title" : sortKey === "subject" ? "Subject" : "Status"}
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="due_date" label="Due date">Due date</SelectItem>
                <SelectItem value="title" label="Title">Title</SelectItem>
                <SelectItem value="subject" label="Subject">Subject</SelectItem>
                <SelectItem value="status" label="Status">Status</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
              aria-label={sortDir === "asc" ? "Sort descending" : "Sort ascending"}
            >
              {sortDir === "asc" ? <ArrowUp className="size-3.5" /> : <ArrowDown className="size-3.5" />}
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        {hasFilters ? (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1.5 text-muted-foreground">
            Clear filters
          </Button>
        ) : (
          <span />
        )}

        <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-1.5">
          <Plus className="size-3.5" />
          New homework
        </Button>
      </div>

      <div className="border rounded-lg border-border bg-background">
        {rows.length === 0 ? (
          <div className="py-16 text-sm text-center text-muted-foreground">
            No homework matches your filters.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Subject</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Due</TableHead>
                <TableHead className="text-right w-28">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(({ homework, subjectName, subjectIcon }) => {
                const overdue = isOverdue(homework, new Date())
                return (
                  <TableRow
                    key={homework.id}
                    data-overdue={overdue || undefined}
                    className={cn("h-14 cursor-pointer", overdue && "bg-red-500/5")}
                    onClick={() => router.push(`/homework/${homework.id}`)}
                  >
                    <TableCell>
                      <span className="flex items-center gap-1.5">
                        <SubjectIcon icon={subjectIcon} className="size-3.5 shrink-0 text-muted-foreground" />
                        {subjectName}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-medium truncate max-w-60">{homework.title}</span>
                    </TableCell>
                    <TableCell>
                      <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", HOMEWORK_STATUS_BADGE[homework.status])}>
                        {HOMEWORK_STATUS_LABELS[homework.status] ?? homework.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={cn("text-sm", overdue ? "font-medium text-red-400" : "text-muted-foreground")}>
                        {formatDate(homework.due_date)}
                        {overdue && <span className="ml-1.5 text-xs text-red-400">· Overdue</span>}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="hover:bg-foreground/10!"
                          render={<Link href={`/homework/${homework.id}`} />}
                          nativeButton={false}
                          aria-label={`View ${homework.title}`}
                        >
                          <Eye className="size-3.5" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="icon-sm"
                          onClick={(e) => { e.stopPropagation(); setDeleteTarget(homework) }}
                          aria-label={`Delete ${homework.title}`}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </div>

      <CreateHomeworkDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        subjects={subjects}
        onCreated={fetchData}
      />

      <DeleteHomeworkDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}
        homework={deleteTarget}
        onDeleted={() => { toast.success("Homework deleted successfully."); fetchData() }}
      />
    </div>
  )
}