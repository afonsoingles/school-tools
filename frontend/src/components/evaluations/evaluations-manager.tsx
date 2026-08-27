"use client"

import { useEffect, useMemo, useState } from "react"
import { Loader2, Plus, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
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
import { cn } from "@/lib/utils"
import { getClasses } from "@/lib/api/calendar"
import { getSubjects } from "@/lib/api/settings"
import { getEvaluations } from "@/lib/api/evaluations"
import type { ClassEvent, Evaluation, Subject } from "@/types"
import { EVALUATION_TYPE_LABELS } from "./constants"
import { CreateEvaluationDialog } from "./create-evaluation-dialog"
import { DeleteEvaluationDialog } from "./delete-evaluation-dialog"

type ShowFilter = "upcoming" | "past" | "all"

function errorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    const body = err.body as { message?: string } | null
    return body?.message ?? "Something went wrong. Please try again."
  }
  return "Something went wrong. Please try again."
}

function datePart(iso: string): string {
  return iso.includes("T") ? iso.split("T")[0] : iso
}

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-")
  const date = new Date(Number(y), Number(m) - 1, Number(d))
  return date.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })
}

export function EvaluationsManager() {
  const [evaluations, setEvaluations] = useState<Evaluation[]>([])
  const [classes, setClasses] = useState<ClassEvent[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [showFilter, setShowFilter] = useState<ShowFilter>("upcoming")
  const [typeFilter, setTypeFilter] = useState("all")
  const [subjectFilter, setSubjectFilter] = useState("all")

  const [createOpen, setCreateOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ evaluation: Evaluation; subjectName: string } | null>(null)

  const fetchData = () => {
    Promise.all([getEvaluations(), getClasses(), getSubjects()])
      .then(([evals, cls, subs]) => {
        setEvaluations(evals)
        setClasses(cls)
        setSubjects(subs)
      })
      .catch((err) => setLoadError(errorMessage(err)))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchData() }, [])

  const classSubjectMap = useMemo(() => {
    return new Map(classes.map((c) => [c.id, c.subject_id]))
  }, [classes])

  const subjectNameMap = useMemo(() => {
    return new Map(subjects.map((s) => [s.id, s.name]))
  }, [subjects])

  const rows = useMemo(() => {
    const today = new Date()
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`

    const mapped = evaluations
      .map((e) => {
        const subjectId = classSubjectMap.get(e.class_id)
        const subjectName = (subjectId && subjectNameMap.get(subjectId)) ?? "Unknown"
        const upcoming = datePart(e.date) >= todayStr
        return { evaluation: e, subjectId, subjectName, upcoming }
      })
      .filter((row) => {
        if (showFilter === "upcoming" && !row.upcoming) return false
        if (showFilter === "past" && row.upcoming) return false
        if (typeFilter !== "all" && row.evaluation.type !== typeFilter) return false
        if (subjectFilter !== "all" && row.subjectId !== subjectFilter) return false
        return true
      })
      .sort((a, b) => {
        const cmp = a.evaluation.date.localeCompare(b.evaluation.date)
        return showFilter === "past" ? -cmp : cmp
      })

    return mapped
  }, [evaluations, showFilter, typeFilter, subjectFilter, classSubjectMap, subjectNameMap])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
      </div>
    )
  }

  if (loadError) {
    return (
      <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/25 rounded-md px-3 py-2">
        {loadError}
      </p>
    )
  }

  if (evaluations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-lg py-24 text-center">
        <p className="text-sm text-muted-foreground">You have no evaluations.</p>
        {classes.length === 0 ? (
          <Button size="sm" disabled>
            Please create a class before creating an evaluation
          </Button>
        ) : (
          <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-1.5">
            <Plus className="size-3.5" />
            New evaluation
          </Button>
        )}

        <CreateEvaluationDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          classes={classes}
          subjects={subjects}
          onCreated={fetchData}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Select value={showFilter} onValueChange={(v) => setShowFilter(String(v) as ShowFilter)}>
            <SelectTrigger className="w-32">
              {showFilter === "upcoming" ? "Upcoming" : showFilter === "past" ? "Past" : "All"}
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="upcoming" label="Upcoming">Upcoming</SelectItem>
              <SelectItem value="past" label="Past">Past</SelectItem>
              <SelectItem value="all" label="All">All</SelectItem>
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={(v) => setTypeFilter(String(v))}>
            <SelectTrigger className="w-36">
              {typeFilter === "all" ? "All types" : EVALUATION_TYPE_LABELS[typeFilter] ?? typeFilter}
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" label="All types">All types</SelectItem>
              {Object.entries(EVALUATION_TYPE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value} label={label}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={subjectFilter} onValueChange={(v) => setSubjectFilter(String(v))}>
            <SelectTrigger className="w-40">
              {subjectFilter === "all"
                ? "All subjects"
                : subjectNameMap.get(subjectFilter) ?? "Unknown"}
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" label="All subjects">All subjects</SelectItem>
              {subjects.map((s) => (
                <SelectItem key={s.id} value={s.id} label={s.name}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-1.5">
          <Plus className="size-3.5" />
          New evaluation
        </Button>
      </div>

      <div className="rounded-lg border border-border bg-background">
        {rows.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            No evaluations match your filters.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Subject</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="w-20 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(({ evaluation, subjectName }) => (
                <TableRow key={evaluation.id}>
                  <TableCell>{subjectName}</TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                        evaluation.type === "exam"
                          ? "bg-red-500/15 text-red-400"
                          : evaluation.type === "quiz"
                            ? "bg-amber-500/15 text-amber-400"
                            : "bg-muted text-muted-foreground"
                      )}
                    >
                      {EVALUATION_TYPE_LABELS[evaluation.type] ?? evaluation.type}
                    </span>
                  </TableCell>
                  <TableCell>{formatDate(datePart(evaluation.date))}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="destructive"
                      size="icon-sm"
                      onClick={() => setDeleteTarget({ evaluation, subjectName })}
                      aria-label={`Delete evaluation for ${subjectName}`}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <CreateEvaluationDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        classes={classes}
        subjects={subjects}
        onCreated={fetchData}
      />

      <DeleteEvaluationDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}
        evaluation={deleteTarget?.evaluation ?? null}
        subjectName={deleteTarget?.subjectName ?? ""}
        onDeleted={fetchData}
      />
    </div>
  )
}