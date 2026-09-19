"use client"

import { useEffect, useMemo, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { CalendarClock, Check, FileText, GraduationCap, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { StatusBadge } from "@/components/ui/status-badge"
import { LoadingState } from "@/components/ui/loading"
import { SubjectSelect } from "@/components/ui/subject-select"
import { SubjectIcon } from "@/components/ui/subject-icon"
import { errorMessage } from "@/lib/errors"
import {
  classSubjectMap as buildClassSubjectMap,
  subjectIconMap as buildSubjectIconMap,
  subjectNameMap as buildSubjectNameMap,
} from "@/lib/subjects"
import { evaluationTypeBadgeClass, evaluationTypeLabel } from "@/lib/evaluations"
import { datePart, formatDateWeekday, isUpcoming, todayDateString } from "@/lib/date-time"
import { getClasses } from "@/lib/api/calendar"
import { getSubjects } from "@/lib/api/settings"
import { getEvaluations, updateEvaluationGrade } from "@/lib/api/evaluations"
import { ErrorBox } from "@/components/ui/error-box"
import { toast } from "sonner"
import type { ClassEvent, Evaluation, Subject } from "@/types"

type ShowFilter = "all" | "past"

interface GradeRow {
  evaluation: Evaluation
  subjectId?: string
  subjectName: string
  subjectIcon: string
}

interface GradeGroup {
  key: string
  subjectName: string
  subjectIcon: string
  rows: GradeRow[]
  graded: number
  average: number | null
}

function computeGroup(
  key: string,
  subjectName: string,
  subjectIcon: string,
  rows: GradeRow[]
): GradeGroup {
  const sorted = [...rows].sort((a, b) => a.evaluation.date.localeCompare(b.evaluation.date))
  const gradedRows = sorted.filter((row) => row.evaluation.grade != null)
  const average =
    gradedRows.length === 0
      ? null
      : gradedRows.reduce((sum, row) => sum + (row.evaluation.grade as number), 0) / gradedRows.length
  return { key, subjectName, subjectIcon, rows: sorted, graded: gradedRows.length, average }
}

function formatAverage(value: number | null): string {
  if (value == null) return "—"
  const rounded = Math.round(value * 10) / 10
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
}

function GradeEditDialog({
  evaluation,
  subjectName,
  onClose,
  onSaved,
}: {
  evaluation: Evaluation
  subjectName: string
  onClose: () => void
  onSaved: () => void
}) {
  const t = useTranslations("evaluations")
  const tCommon = useTranslations("common")
  const locale = useLocale()
  const [value, setValue] = useState(evaluation.grade == null ? "" : String(evaluation.grade))
  const [saving, setSaving] = useState(false)

  async function save(clear: boolean) {
    const next = clear ? null : value.trim() === "" ? null : Number(value.trim())
    if (next !== null && (Number.isNaN(next) || next < 0 || next > 100 || !Number.isInteger(next))) {
      toast.error(t("gradeInvalid"))
      return
    }
    if (next === evaluation.grade) {
      onClose()
      return
    }
    setSaving(true)
    try {
      await updateEvaluationGrade(evaluation.id, next)
      toast.success(next === null ? t("gradeCleared") : t("gradeSaved"))
      onSaved()
      onClose()
    } catch (err) {
      toast.error(errorMessage(err))
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={(next) => !next && !saving && onClose()}>
      <DialogContent>
        <form className="flex flex-col gap-4" onSubmit={(event) => { event.preventDefault(); save(false) }}>
          <DialogHeader>
            <DialogTitle>{t("editGrade.title")}</DialogTitle>
            <DialogDescription>
              {subjectName} · {formatDateWeekday(datePart(evaluation.date), locale)}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-grade">{t("grade")}</Label>
            <Input
              id="edit-grade"
              type="number"
              min={0}
              max={100}
              inputMode="numeric"
              autoFocus
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" disabled={saving} onClick={() => save(true)}>
              {t("editGrade.clearGrade")}
            </Button>
            <Button type="button" variant="ghost" disabled={saving} onClick={onClose}>
              {tCommon("actions.cancel")}
            </Button>
            <Button type="submit" disabled={saving} className="gap-1.5">
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
              {tCommon("actions.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function GradesManager() {
  const t = useTranslations("grades")
  const tEval = useTranslations("evaluations")
  const tCommon = useTranslations("common")
  const locale = useLocale()
  const [evaluations, setEvaluations] = useState<Evaluation[]>([])
  const [classes, setClasses] = useState<ClassEvent[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [gradeTarget, setGradeTarget] = useState<{ evaluation: Evaluation; subjectName: string } | null>(null)

  const [showFilter, setShowFilter] = useState<ShowFilter>("all")
  const [typeFilter, setTypeFilter] = useState("all")
  const [subjectFilter, setSubjectFilter] = useState("all")

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

  const classSubjectMap = useMemo(
    () => buildClassSubjectMap(classes),
    [classes]
  )

  const subjectNameMap = useMemo(
    () => buildSubjectNameMap(subjects),
    [subjects]
  )

  const subjectIconMap = useMemo(
    () => buildSubjectIconMap(subjects),
    [subjects]
  )

  function showLabel(value: string): string {
    if (value === "past") return tCommon("filters.past")
    return tCommon("filters.all")
  }

  const { groups, overallAverage, overallGraded, overallTotal } = useMemo(() => {
    const todayStr = todayDateString()

    const mapped: GradeRow[] = evaluations.map((e) => {
      const subjectId = classSubjectMap.get(e.class_id)
      const subjectName = (subjectId && subjectNameMap.get(subjectId)) ?? tEval("unknownSubject")
      return {
        evaluation: e,
        subjectId,
        subjectName,
        subjectIcon: (subjectId && subjectIconMap.get(subjectId)) ?? "",
      }
    })

    const filtered = mapped.filter((row) => {
      if (showFilter === "past" && isUpcoming(row.evaluation.date, todayStr)) return false
      if (typeFilter !== "all" && row.evaluation.type !== typeFilter) return false
      if (subjectFilter !== "all" && row.subjectId !== subjectFilter) return false
      return true
    })

    const knownSubjectIds = new Set(subjects.map((s) => s.id))
    const groups: GradeGroup[] = []

    if (subjectFilter === "all") {
      for (const subject of subjects) {
        const rows = filtered.filter((row) => row.subjectId === subject.id)
        if (rows.length === 0) continue
        groups.push(computeGroup(subject.id, subject.name, subject.icon, rows))
      }
      const orphanRows = filtered.filter(
        (row) => !row.subjectId || !knownSubjectIds.has(row.subjectId)
      )
      if (orphanRows.length > 0) {
        groups.push(
          computeGroup("__orphan__", orphanRows[0].subjectName, orphanRows[0].subjectIcon, orphanRows)
        )
      }
    } else {
      const rows = filtered.filter((row) => row.subjectId === subjectFilter)
      if (rows.length > 0) {
        groups.push(computeGroup(subjectFilter, rows[0].subjectName, rows[0].subjectIcon, rows))
      }
    }

    const allGraded = filtered.filter((row) => row.evaluation.grade != null)
    const overallAverage = allGraded.length === 0
      ? null
      : allGraded.reduce((sum, row) => sum + (row.evaluation.grade as number), 0) / allGraded.length

    return {
      groups,
      overallAverage,
      overallGraded: allGraded.length,
      overallTotal: filtered.length,
    }
  }, [evaluations, classSubjectMap, subjectNameMap, subjectIconMap, subjects, showFilter, typeFilter, subjectFilter, tEval])

  if (loading) {
    return <LoadingState />
  }

  if (loadError) {
    return <ErrorBox>{loadError}</ErrorBox>
  }

  if (evaluations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-lg py-24 text-center">
        <GraduationCap className="size-8 text-muted-foreground" />
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium">{t("emptyTitle")}</p>
          <p className="text-sm text-muted-foreground">{t("emptyDescription")}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Select value={showFilter} onValueChange={(v) => setShowFilter(String(v) as ShowFilter)}>
            <SelectTrigger className="h-9 w-48">
              <span className="flex min-w-0 flex-1 items-center gap-1.5">
                <CalendarClock className="size-3.5 shrink-0 text-muted-foreground" />
                <span className="text-muted-foreground">{tEval("showFilter")}</span>
                <span className="select-none text-muted-foreground">·</span>
                <SelectValue className="truncate">
                  {(value) => showLabel(String(value))}
                </SelectValue>
              </span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" label={tCommon("filters.all")}>{tCommon("filters.all")}</SelectItem>
              <SelectItem value="past" label={tCommon("filters.past")}>{tCommon("filters.past")}</SelectItem>
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={(v) => setTypeFilter(String(v))}>
            <SelectTrigger className="h-9 w-44">
              <span className="flex min-w-0 flex-1 items-center gap-1.5">
                <FileText className="size-3.5 shrink-0 text-muted-foreground" />
                <span className="text-muted-foreground">{tCommon("fields.type")}</span>
                <span className="select-none text-muted-foreground">·</span>
                <SelectValue className="truncate">
                  {(value) => (String(value) === "all" ? tEval("allTypes") : evaluationTypeLabel(tEval, String(value)))}
                </SelectValue>
              </span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" label={tEval("allTypes")}>{tEval("allTypes")}</SelectItem>
              <SelectItem value="exam" label={tEval("type.exam")}>{tEval("type.exam")}</SelectItem>
              <SelectItem value="quiz" label={tEval("type.quiz")}>{tEval("type.quiz")}</SelectItem>
              <SelectItem value="other" label={tEval("type.other")}>{tEval("type.other")}</SelectItem>
            </SelectContent>
          </Select>

          <SubjectSelect
            value={subjectFilter}
            onValueChange={setSubjectFilter}
            subjects={subjects}
            placeholder={tEval("allSubjects")}
            className="w-52"
            variant="filter"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardDescription>{t("summary.average")}</CardDescription>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-semibold tabular-nums">
              {formatAverage(overallAverage)}
            </span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>{t("summary.gradedLabel")}</CardDescription>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-semibold tabular-nums">
              {overallGraded}
              <span className="text-sm font-normal text-muted-foreground"> / {overallTotal}</span>
            </span>
          </CardContent>
        </Card>
      </div>

      {groups.length === 0 ? (
        <div className="py-16 text-center text-sm text-muted-foreground">
          {t("noMatches")}
        </div>
      ) : (
        groups.map((group) => (
          <div key={group.key} className="rounded-lg border border-border bg-background">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
              <span className="flex min-w-0 items-center gap-2 text-sm font-medium">
                <SubjectIcon icon={group.subjectIcon} className="size-4 shrink-0 text-muted-foreground" />
                <span className="truncate">{group.subjectName}</span>
              </span>
              <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground tabular-nums">
                <span>{t("section.average", { value: formatAverage(group.average) })}</span>
                <span>{t("section.count", { count: group.rows.length })}</span>
                <span>{t("section.ungraded", { count: group.rows.length - group.graded })}</span>
              </span>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{tCommon("fields.date")}</TableHead>
                  <TableHead>{tCommon("fields.type")}</TableHead>
                  <TableHead className="w-20 text-right">{tCommon("fields.grade")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {group.rows.map(({ evaluation, subjectName }) => (
                  <TableRow key={evaluation.id}>
                    <TableCell>{formatDateWeekday(datePart(evaluation.date), locale)}</TableCell>
                    <TableCell>
                      <StatusBadge className={evaluationTypeBadgeClass(evaluation.type)}>
                        {evaluationTypeLabel(tEval, evaluation.type)}
                      </StatusBadge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="tabular-nums"
                        onClick={() => setGradeTarget({ evaluation, subjectName })}
                        aria-label={tEval("editGrade.aria", { subject: subjectName })}
                      >
                        {evaluation.grade == null ? (
                          <span className="text-muted-foreground">{t("gradeEmpty")}</span>
                        ) : (
                          evaluation.grade
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ))
      )}

      {gradeTarget && (
        <GradeEditDialog
          key={gradeTarget.evaluation.id}
          evaluation={gradeTarget.evaluation}
          subjectName={gradeTarget.subjectName}
          onClose={() => setGradeTarget(null)}
          onSaved={fetchData}
        />
      )}
    </div>
  )
}