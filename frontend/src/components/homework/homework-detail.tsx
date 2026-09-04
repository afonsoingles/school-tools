"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  CircleDashed,
  Loader2,
  Pencil,
  Trash2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { ApiError } from "@/lib/api/client"
import { SubjectIcon } from "@/components/ui/subject-icon"
import { useTimezone } from "@/components/layout/timezone-provider"
import { getSubjects } from "@/lib/api/settings"
import { getHomework, updateHomework } from "@/lib/api/homework"
import type { Homework, HomeworkStatus, Subject } from "@/types"
import {
  HOMEWORK_STATUS_BADGE,
  HOMEWORK_STATUS_LABELS,
  HOMEWORK_STATUS_ORDER,
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

function errorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    const body = err.body as { message?: string } | null
    return body?.message ?? "Something went wrong. Please try again."
  }
  return "Something went wrong. Please try again."
}

function formatDate(iso: string, tz: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString("en-GB", {
    timeZone: tz,
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

interface HomeworkDetailProps {
  id: string
}

export function HomeworkDetail({ id }: HomeworkDetailProps) {
  const router = useRouter()
  const timezone = useTimezone()
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
    if (homework === null || homework.status === "finished") return false
    return new Date(homework.due_date).getTime() < new Date().getTime()
  }, [homework])

  async function changeStatus(status: HomeworkStatus) {
    if (!homework || homework.status === status) return
    setChanging(true)
    setStatusError(null)
    try {
      await updateHomework(homework.id, {
        subject_id: homework.subject_id,
        title: homework.title,
        description: homework.description,
        due_date: homework.due_date,
        status,
      })
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
    toast.success("Homework deleted successfully.")
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
        Back to homework
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={() => setEditOpen(true)}
        className="gap-1.5"
      >
        <Pencil className="size-3.5" />
        Edit
      </Button>

      <Button
        variant="destructive"
        size="sm"
        onClick={() => setDeleteOpen(true)}
        className="gap-1.5"
      >
        <Trash2 className="size-3.5" />
        Delete
      </Button>
    </div>
  )

  if (loading) {
    return (
      <>
        {control}
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
        </div>
      </>
    )
  }

  if (loadError || !homework) {
    return (
      <>
        {control}
        <p className="px-3 py-2 text-sm text-red-400 border rounded-md bg-red-500/10 border-red-500/25">
          {loadError ?? "This homework could not be found."}
        </p>
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
            <span className="font-medium text-foreground">{subject?.name ?? "Unknown subject"}</span>
          </span>
          <span className={overdue ? "font-medium text-red-400" : ""}>
            <CalendarClock className="mr-1 inline size-3.5" />
            {formatDate(homework.due_date, timezone)}
            {overdue && <span className="ml-1.5 text-xs text-red-400">· Overdue</span>}
          </span>

          <span aria-hidden="true" className="text-muted-foreground/40">·</span>

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button size="sm" variant="outline" className="gap-1.5 h-7 rounded-full px-2.5">
                  {homework.status === "finished" ? (
                    <CheckCircle2 className="size-3.5" />
                  ) : homework.status === "ongoing" ? (
                    <CircleDashed className="size-3.5" />
                  ) : (
                    <CalendarClock className="size-3.5" />
                  )}
                  <span className={BadgeStyled(homework.status)}>
                    {changing && <Loader2 className="size-3 animate-spin" />}
                    {HOMEWORK_STATUS_LABELS[homework.status] ?? homework.status}
                  </span>
                  <ChevronDown className="size-3.5 text-muted-foreground" />
                </Button>
              }
            />
            <DropdownMenuContent align="start">
              <DropdownMenuGroup>
                <DropdownMenuLabel>Change status</DropdownMenuLabel>
                <DropdownMenuRadioGroup
                  value={homework.status}
                  onValueChange={(v) => changeStatus(v as HomeworkStatus)}
                >
                  {HOMEWORK_STATUS_ORDER.map((s) => (
                    <DropdownMenuRadioItem key={s} value={s}>
                      {HOMEWORK_STATUS_LABELS[s]}
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
        <h2 className="mb-1.5 text-sm font-semibold text-muted-foreground">Description</h2>
        <p className="max-w-2xl text-sm leading-relaxed whitespace-pre-wrap text-foreground">
          {homework.description || "No description provided."}
        </p>
      </div>

      {statusError && (
        <p className="px-3 py-2 text-sm text-red-400 border rounded-md bg-red-500/10 border-red-500/25">
          {statusError}
        </p>
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

function BadgeStyled(status: HomeworkStatus): string {
  return `inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${HOMEWORK_STATUS_BADGE[status]}`
}