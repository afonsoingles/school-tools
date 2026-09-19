"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useLocale, useTranslations } from "next-intl"
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CalendarClock,
  Clock3,
  Eye,
  LayoutGrid,
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
import { ErrorBox } from "@/components/ui/error-box"
import { LoadingState } from "@/components/ui/loading"
import { StatusBadge } from "@/components/ui/status-badge"
import { SubjectSelect } from "@/components/ui/subject-select"
import { errorMessage } from "@/lib/errors"
import { subjectIconMap as buildSubjectIconMap, subjectNameMap as buildSubjectNameMap } from "@/lib/subjects"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { SubjectIcon } from "@/components/ui/subject-icon"
import { useTimezone } from "@/components/layout/timezone-provider"
import { formatInTz } from "@/lib/date-time"
import { getSubjects } from "@/lib/api/settings"
import { getHomework } from "@/lib/api/homework"
import type { Homework, Subject } from "@/types"
import { HOMEWORK_STATUS_BADGE, HOMEWORK_STATUS_ICON, HOMEWORK_STATUS_ORDER, isOverdueHomework } from "./constants"
import { CreateHomeworkDialog } from "./create-homework-dialog"
import { DeleteHomeworkDialog } from "./delete-homework-dialog"

type SortKey = "due_date" | "title" | "subject" | "status"

function isUpcoming(hw: Homework): boolean {
  if (hw.status === "finished") return false
  return true
}

function formatDate(iso: string, tz: string, locale: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return formatInTz(d, tz, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }, locale)
}

export function HomeworkManager() {
  const timezone = useTimezone()
  const locale = useLocale()
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

  const t = useTranslations("homework")
  const sortLabels: Record<SortKey, string> = {
    due_date: t("sortDueDate"),
    title: t("sortTitle"),
    subject: t("sortSubject"),
    status: t("sortStatus"),
  }
  const statusLabels: Record<string, string> = {
    not_started: t("statusNotStarted"),
    ongoing: t("statusOngoing"),
    finished: t("statusFinished"),
  }

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
    () => buildSubjectNameMap(subjects),
    [subjects]
  )
  const subjectIconMap = useMemo(
    () => buildSubjectIconMap(subjects),
    [subjects]
  )

  const rows = useMemo(() => {
    const now = new Date()
    const q = search.trim().toLowerCase()

    const filtered = homeworks.filter((hw) => {
      if (q && !`${hw.title} ${hw.description}`.toLowerCase().includes(q)) return false
      if (subjectFilter !== "all" && hw.subject_id !== subjectFilter) return false
      if (timeFilter === "overdue" && !isOverdueHomework(hw, now)) return false
      if (timeFilter === "upcoming" && !isUpcoming(hw)) return false
      return true
    })

    const mapped = filtered.map((hw) => ({
      homework: hw,
      subjectName: subjectNameMap.get(hw.subject_id) ?? t("unknownSubject"),
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
  }, [homeworks, search, subjectFilter, timeFilter, sortKey, sortDir, subjectNameMap, subjectIconMap, t])

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
      <LoadingState />
    )
  }

  if (loadError) {
    return (
      <ErrorBox>{loadError}</ErrorBox>
    )
  }

  if (homeworks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-center rounded-lg">
        <p className="text-sm text-muted-foreground">{t("noHomework")}</p>
        {subjects.length === 0 ? (
          <Button size="sm" disabled>
            {t("createSubjectFirst")}
          </Button>
        ) : (
          <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-1.5">
            <Plus className="size-3.5" />
            {t("newHomework")}
          </Button>
        )}

        <CreateHomeworkDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          subjects={subjects}
          onCreated={() => { toast.success(t("createdSuccess")); fetchData() }}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-0.5 rounded-lg border border-border bg-muted p-0.5">
          <Button
            variant={timeFilter === "all" ? "default" : "ghost"}
            size="sm"
            onClick={() => setTimeFilter("all")}
            className={cn("gap-1.5 px-3", timeFilter !== "all" && "text-muted-foreground hover:text-foreground")}
          >
            <LayoutGrid className="size-3.5" />
            {t("all")}
          </Button>
          <Button
            variant={timeFilter === "upcoming" ? "default" : "ghost"}
            size="sm"
            onClick={() => setTimeFilter("upcoming")}
            className={cn("gap-1.5 px-3", timeFilter !== "upcoming" && "text-muted-foreground hover:text-foreground")}
          >
            <Clock3 className="size-3.5" />
            {t("upcoming")}
          </Button>
          <Button
            variant={timeFilter === "overdue" ? "default" : "ghost"}
            size="sm"
            onClick={() => setTimeFilter("overdue")}
            className={cn("gap-1.5 px-3", timeFilter !== "overdue" && "text-muted-foreground hover:text-foreground")}
          >
            <CalendarClock className="size-3.5" />
            {t("overdueFilter")}
          </Button>
        </div>

        <div className="relative w-full sm:w-60">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="h-9 pl-8"
          />
        </div>

        <SubjectSelect
          value={subjectFilter}
          onValueChange={setSubjectFilter}
          subjects={subjects}
          placeholder={t("allSubjects")}
          className="w-52"
          variant="filter"
        />

        <div className="flex items-center gap-1.5">
          <Select
            value={sortKey}
            onValueChange={(v) => setSortKey(String(v) as SortKey)}
          >
            <SelectTrigger className="h-9 w-44">
              <span className="flex min-w-0 flex-1 items-center gap-1.5">
                <ArrowUpDown className="size-3.5 shrink-0 text-muted-foreground" />
                <span className="text-muted-foreground">{t("sortBy")}</span>
                <span className="select-none text-muted-foreground">·</span>
                <SelectValue className="truncate">
                  {(value) => sortLabels[String(value) as SortKey] ?? t("sortDueDate")}
                </SelectValue>
              </span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="due_date" label={t("sortDueDate")}>{t("sortDueDate")}</SelectItem>
              <SelectItem value="title" label={t("sortTitle")}>{t("sortTitle")}</SelectItem>
              <SelectItem value="subject" label={t("sortSubject")}>{t("sortSubject")}</SelectItem>
              <SelectItem value="status" label={t("sortStatus")}>{t("sortStatus")}</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon-sm"
            className="h-9"
            onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
            aria-label={sortDir === "asc" ? t("sortDescending") : t("sortAscending")}
          >
            {sortDir === "asc" ? <ArrowUp className="size-3.5" /> : <ArrowDown className="size-3.5" />}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        {hasFilters ? (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1.5 text-muted-foreground">
            {t("clearFilters")}
          </Button>
        ) : (
          <span />
        )}

        <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-1.5">
          <Plus className="size-3.5" />
          {t("newHomework")}
        </Button>
      </div>

      <div className="border rounded-lg border-border bg-background">
        {rows.length === 0 ? (
          <div className="py-16 text-sm text-center text-muted-foreground">
            {t("noMatches")}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("colSubject")}</TableHead>
                <TableHead>{t("colTitle")}</TableHead>
                <TableHead>{t("colStatus")}</TableHead>
                <TableHead>{t("colDue")}</TableHead>
                <TableHead className="text-right w-28">{t("colActions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(({ homework, subjectName, subjectIcon }) => {
                const overdue = isOverdueHomework(homework, new Date())
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
                      <StatusBadge icon={HOMEWORK_STATUS_ICON[homework.status]} className={HOMEWORK_STATUS_BADGE[homework.status]}>
                        {statusLabels[homework.status] ?? homework.status}
                      </StatusBadge>
                    </TableCell>
                    <TableCell>
                      <span className={cn("text-sm", overdue ? "font-medium text-red-400" : "text-muted-foreground")}>
                        {formatDate(homework.due_date, timezone, locale)}
                        {overdue && <span className="ml-1.5 text-xs text-red-400">· {t("overdue")}</span>}
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
                          aria-label={t("viewAria", { title: homework.title })}
                        >
                          <Eye className="size-3.5" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="icon-sm"
                          onClick={(e) => { e.stopPropagation(); setDeleteTarget(homework) }}
                          aria-label={t("deleteAria", { title: homework.title })}
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
        onCreated={() => { toast.success(t("createdSuccess")); fetchData() }}
      />

      <DeleteHomeworkDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}
        homework={deleteTarget}
        onDeleted={() => { toast.success(t("deletedSuccess")); fetchData() }}
      />
    </div>
  )
}