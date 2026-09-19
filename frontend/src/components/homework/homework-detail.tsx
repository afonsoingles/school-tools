"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useLocale, useTranslations } from "next-intl"
import {
  ArrowLeft,
  CalendarClock,
  ChevronDown,
  Loader2,
  Pencil,
  Trash2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { SubjectIcon } from "@/components/ui/subject-icon"
import { ErrorBox } from "@/components/ui/error-box"
import { LoadingState } from "@/components/ui/loading"
import { StatusBadge } from "@/components/ui/status-badge"
import { errorMessage } from "@/lib/errors"
import { useTimezone } from "@/components/layout/timezone-provider"
import { formatInTz } from "@/lib/date-time"
import { getSubjects } from "@/lib/api/settings"
import { getHomework, updateHomework } from "@/lib/api/homework"
import type { Homework, HomeworkStatus, Subject } from "@/types"
import {
  HOMEWORK_STATUS_BADGE,
  HOMEWORK_STATUS_ICON,
  HOMEWORK_STATUS_ORDER,
  isOverdueHomework,
} from "./constants"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { DeleteHomeworkDialog } from "./delete-homework-dialog"
import { EditHomeworkDialog } from "./edit-homework-dialog"

function formatDate(iso: string, tz: string, locale: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return formatInTz(d, tz, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }, locale)
}

interface HomeworkDetailProps {
  id: string
}

export function HomeworkDetail({ id }: HomeworkDetailProps) {
  const router = useRouter()
  const timezone = useTimezone()
  const locale = useLocale()
  const t = useTranslations("homework")
  const tCommon = useTranslations("common.actions")
  const statusLabels: Record<string, string> = {
    not_started: t("statusNotStarted"),
    ongoing: t("statusOngoing"),
    finished: t("statusFinished"),
  }
  const [homeworks, setHomeworks] = useState<Homework[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [changing, setChanging] = useState(false)
  const [statusError, setStatusError] = useState<string | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)

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

  const homework = homeworks.find((h) => h.id === id) ?? null

  useEffect(() => {
    if (!loading && !homework) {
      router.replace("/homework")
    }
  }, [loading, homework, router])

  const subject = useMemo(
    () => (homework ? subjects.find((s) => s.id === homework.subject_id) ?? null : null),
    [homework, subjects]
  )

  const overdue = useMemo(() => {
    if (homework === null) return false
    return isOverdueHomework(homework, new Date())
  }, [homework])

  async function changeStatus(status: HomeworkStatus) {
    if (!homework || homework.status === status) return
    setChanging(true)
    setStatusError(null)
    try {
      await updateHomework(homework.id, { status })
      setHomeworks((prev) =>
        prev.map((h) => (h.id === homework.id ? { ...h, status } : h))
      )
    } catch (err) {
      setStatusError(errorMessage(err))
    } finally {
      setChanging(false)
    }
  }

  function handleDelete() {
    toast.success(t("deletedSuccess"))
    router.push("/homework")
  }

  const control = (
    <div className="flex flex-wrap items-center gap-2 pb-6">
      <Button
        render={<Link href="/homework" />}
        variant="outline"
        size="sm"
        nativeButton={false}
        className="gap-1.5"
      >
        <ArrowLeft className="size-3.5" />
        {t("backToHomework")}
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={() => setEditOpen(true)}
        className="gap-1.5"
      >
        <Pencil className="size-3.5" />
        {tCommon("edit")}
      </Button>

      <Button
        variant="destructive"
        size="sm"
        onClick={() => setDeleteOpen(true)}
        className="gap-1.5"
      >
        <Trash2 className="size-3.5" />
        {tCommon("delete")}
      </Button>
    </div>
  )

  if (loading) {
    return (
      <>
        {control}
        <LoadingState />
      </>
    )
  }

  if (loadError || !homework) {
    return (
      <>
        {control}
        <ErrorBox>{loadError ?? t("notFound")}</ErrorBox>
      </>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {control}

      <div className="flex flex-col gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {homework.title}
        </h1>
        <div className="flex flex-wrap items-center text-sm gap-x-4 gap-y-2 text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <SubjectIcon icon={subject?.icon ?? ""} className="size-3.5 shrink-0 text-muted-foreground" />
            <span className="font-medium text-foreground">{subject?.name ?? t("unknownSubject")}</span>
          </span>
          <span className={overdue ? "font-medium text-red-400" : ""}>
            <CalendarClock className="mr-1 inline size-3.5" />
            {formatDate(homework.due_date, timezone, locale)}
            {overdue && <span className="ml-1.5 text-xs text-red-400">· {t("overdue")}</span>}
          </span>

          <span aria-hidden="true" className="text-muted-foreground/40">·</span>

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button size="sm" variant="outline" className="gap-1.5 h-7 rounded-full px-2.5">
                  {(() => {
                    const StatusIcon = HOMEWORK_STATUS_ICON[homework.status]
                    return <StatusIcon className="size-3.5" />
                  })()}
                  <StatusBadge className={HOMEWORK_STATUS_BADGE[homework.status]}>
                    {changing && <Loader2 className="size-3 animate-spin" />}
                    {statusLabels[homework.status] ?? homework.status}
                  </StatusBadge>
                  <ChevronDown className="size-3.5 text-muted-foreground" />
                </Button>
              }
            />
            <DropdownMenuContent align="start">
              <DropdownMenuGroup>
                <DropdownMenuLabel>{t("changeStatus")}</DropdownMenuLabel>
                <DropdownMenuRadioGroup
                  value={homework.status}
                  onValueChange={(v) => changeStatus(v as HomeworkStatus)}
                >
                  {HOMEWORK_STATUS_ORDER.map((s) => (
                    <DropdownMenuRadioItem key={s} value={s}>
                      {statusLabels[s] ?? s}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="h-px bg-border" />

      <div>
        <h2 className="mb-1.5 text-sm font-semibold text-muted-foreground">{t("description")}</h2>
        <p className="max-w-2xl text-sm leading-relaxed whitespace-pre-wrap text-foreground">
          {homework.description || t("noDescription")}
        </p>
      </div>

      {statusError && (
        <ErrorBox>{statusError}</ErrorBox>
      )}

      <DeleteHomeworkDialog
        open={deleteOpen}
        onOpenChange={(open) => { if (!open) setDeleteOpen(false) }}
        homework={homework}
        onDeleted={handleDelete}
      />

      {editOpen && (
        <EditHomeworkDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          homework={homework}
          subjects={subjects}
          onUpdated={fetchData}
        />
      )}
    </div>
  )
}