"use client"

import { useEffect, useMemo, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { CalendarClock, Check, FileText, Loader2, Plus, Trash2 } from "lucide-react"

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
import { StatusBadge } from "@/components/ui/status-badge"
import { LoadingState } from "@/components/ui/loading"
import { SubjectSelect } from "@/components/ui/subject-select"
import { SubjectIcon } from "@/components/ui/subject-icon"
import { errorMessage } from "@/lib/errors"
import { classSubjectMap as buildClassSubjectMap, subjectIconMap as buildSubjectIconMap, subjectNameMap as buildSubjectNameMap } from "@/lib/subjects"
import { evaluationTypeBadgeClass, evaluationTypeLabel } from "@/lib/evaluations"
import { datePart, formatDateWeekday, isUpcoming, todayDateString } from "@/lib/date-time"
import { getClasses } from "@/lib/api/calendar"
import { getSubjects } from "@/lib/api/settings"
import { toast } from "sonner"
import { ErrorBox } from "@/components/ui/error-box"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { getEvaluations, updateEvaluationGrade } from "@/lib/api/evaluations"
import type { ClassEvent, Evaluation, Subject } from "@/types"
import { CreateEvaluationDialog } from "./create-evaluation-dialog"
import { DeleteEvaluationDialog } from "./delete-evaluation-dialog"

type ShowFilter = "upcoming" | "past" | "all"

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

export function EvaluationsManager() {
  const t = useTranslations("evaluations")
  const tCommon = useTranslations("common")
  const locale = useLocale()
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
  const [gradeTarget, setGradeTarget] = useState<{ evaluation: Evaluation; subjectName: string } | null>(null)

  function showLabel(value: string): string {
    if (value === "upcoming") return tCommon("filters.upcoming")
    if (value === "past") return tCommon("filters.past")
    return tCommon("filters.all")
  }

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
    return buildClassSubjectMap(classes)
  }, [classes])

  const subjectNameMap = useMemo(
    () => buildSubjectNameMap(subjects),
    [subjects]
  )

  const subjectIconMap = useMemo(
    () => buildSubjectIconMap(subjects),
    [subjects]
  )

  const rows = useMemo(() => {
    const todayStr = todayDateString()

    const mapped = evaluations
      .map((e) => {
        const subjectId = classSubjectMap.get(e.class_id)
        const subjectName = (subjectId && subjectNameMap.get(subjectId)) ?? t("unknownSubject")
        const upcoming = isUpcoming(e.date, todayStr)
        return {
          evaluation: e,
          subjectId,
          subjectName,
          subjectIcon: (subjectId && subjectIconMap.get(subjectId)) ?? "",
          upcoming,
        }
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
  }, [evaluations, showFilter, typeFilter, subjectFilter, classSubjectMap, subjectNameMap, subjectIconMap, t])

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

  if (evaluations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-lg py-24 text-center">
        <p className="text-sm text-muted-foreground">{t("noEvaluations")}</p>
        {classes.length === 0 ? (
          <Button size="sm" disabled>
            {t("createClassFirst")}
          </Button>
        ) : (
          <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-1.5">
            <Plus className="size-3.5" />
            {t("newEvaluation")}
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
            <SelectTrigger className="h-9 w-48">
              <span className="flex min-w-0 flex-1 items-center gap-1.5">
                <CalendarClock className="size-3.5 shrink-0 text-muted-foreground" />
                <span className="text-muted-foreground">{t("showFilter")}</span>
                <span className="select-none text-muted-foreground">·</span>
                <SelectValue className="truncate">
                  {(value) => showLabel(String(value))}
                </SelectValue>
              </span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="upcoming" label={tCommon("filters.upcoming")}>{tCommon("filters.upcoming")}</SelectItem>
              <SelectItem value="past" label={tCommon("filters.past")}>{tCommon("filters.past")}</SelectItem>
              <SelectItem value="all" label={tCommon("filters.all")}>{tCommon("filters.all")}</SelectItem>
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={(v) => setTypeFilter(String(v))}>
            <SelectTrigger className="h-9 w-44">
              <span className="flex min-w-0 flex-1 items-center gap-1.5">
                <FileText className="size-3.5 shrink-0 text-muted-foreground" />
                <span className="text-muted-foreground">{tCommon("fields.type")}</span>
                <span className="select-none text-muted-foreground">·</span>
                <SelectValue className="truncate">
                  {(value) => (String(value) === "all" ? tCommon("filters.all") : evaluationTypeLabel(t, String(value)))}
                </SelectValue>
              </span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" label={t("allTypes")}>{t("allTypes")}</SelectItem>
              <SelectItem value="exam" label={t("type.exam")}>{t("type.exam")}</SelectItem>
              <SelectItem value="quiz" label={t("type.quiz")}>{t("type.quiz")}</SelectItem>
              <SelectItem value="other" label={t("type.other")}>{t("type.other")}</SelectItem>
            </SelectContent>
          </Select>

          <SubjectSelect
            value={subjectFilter}
            onValueChange={setSubjectFilter}
            subjects={subjects}
            placeholder={t("allSubjects")}
            className="w-52"
            variant="filter"
          />
        </div>

        <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-1.5">
          <Plus className="size-3.5" />
          {t("newEvaluation")}
        </Button>
      </div>

      <div className="rounded-lg border border-border bg-background">
        {rows.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            {t("noMatches")}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{tCommon("fields.subject")}</TableHead>
                <TableHead>{tCommon("fields.type")}</TableHead>
                <TableHead>{tCommon("fields.date")}</TableHead>
                <TableHead className="w-28 text-right">{tCommon("fields.grade")}</TableHead>
                <TableHead className="w-20 text-right">{tCommon("fields.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(({ evaluation, subjectName, subjectIcon }) => (
                <TableRow key={evaluation.id}>
                  <TableCell>
                    <span className="flex items-center gap-1.5">
                      <SubjectIcon icon={subjectIcon} className="size-3.5 shrink-0 text-muted-foreground" />
                      {subjectName}
                    </span>
                  </TableCell>
                  <TableCell>
                    <StatusBadge className={evaluationTypeBadgeClass(evaluation.type)}>
                      {evaluationTypeLabel(t, evaluation.type)}
                    </StatusBadge>
                  </TableCell>
                  <TableCell>{formatDateWeekday(datePart(evaluation.date), locale)}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="tabular-nums"
                      onClick={() => setGradeTarget({ evaluation, subjectName })}
                      aria-label={t("editGrade.aria", { subject: subjectName })}
                    >
                      {evaluation.grade != null ? (
                        evaluation.grade
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </Button>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="destructive"
                      size="icon-sm"
                      onClick={() => setDeleteTarget({ evaluation, subjectName })}
                      aria-label={t("deleteAria", { subject: subjectName })}
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
