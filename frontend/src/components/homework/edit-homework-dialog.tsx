"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DateTimePicker } from "@/components/ui/date-time-picker"
import { SubjectIcon } from "@/components/ui/subject-icon"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select"
import { ApiError } from "@/lib/api/client"
import { updateHomework } from "@/lib/api/homework"
import type { Homework, Subject } from "@/types"
import { toast } from "sonner"

interface EditHomeworkDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  homework: Homework | null
  subjects: Subject[]
  onUpdated: () => void
}

function errorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    const body = err.body as { message?: string } | null
    return body?.message ?? "Something went wrong. Please try again."
  }
  return "Something went wrong. Please try again."
}

export function EditHomeworkDialog({
  open,
  onOpenChange,
  homework,
  subjects,
  onUpdated,
}: EditHomeworkDialogProps) {
  const [subjectId, setSubjectId] = useState(homework?.subject_id ?? "")
  const [title, setTitle] = useState(homework?.title ?? "")
  const [description, setDescription] = useState(homework?.description ?? "")
  const [datetime, setDatetime] = useState<Date | undefined>(homework ? new Date(homework.due_date) : undefined)
  const [loading, setLoading] = useState(false)

  const selectedSubj = subjects.find((s) => s.id === subjectId)

  const dueDate = datetime ? toDateTimeInput(datetime) : ""

  function handleOpenChange(next: boolean, details?: { reason?: string }) {
    if (!next) {
      if (details?.reason === "outside-press") return
      onOpenChange(false)
      return
    }
    onOpenChange(true)
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!homework || !subjectId || !title.trim() || !description.trim() || !datetime) return

    setLoading(true)

    try {
      await updateHomework(homework.id, {
        subject_id: subjectId,
        title: title.trim(),
        description: description.trim(),
        due_date: dueDate,
        status: homework.status,
      })
      toast.success("Homework was updated successfully.")
      onUpdated()
      onOpenChange(false)
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange} disablePointerDismissal>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <DialogHeader>
            <DialogTitle>Edit homework</DialogTitle>
            <DialogDescription>Update the details for this homework.</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label>Subject</Label>
              <Select value={subjectId} onValueChange={(v) => setSubjectId(String(v))}>
                <SelectTrigger>
                  {selectedSubj ? (
                    <span className="flex items-center gap-1.5">
                      <SubjectIcon icon={selectedSubj.icon} className="size-3.5 shrink-0 text-muted-foreground" />
                      {selectedSubj.name}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Select a subject</span>
                  )}
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((s) => (
                    <SelectItem key={s.id} value={s.id} label={s.name}>
                      <span className="flex items-center gap-1.5">
                        <SubjectIcon icon={s.icon} className="size-3.5 shrink-0 text-muted-foreground" />
                        {s.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Due date</Label>
              <DateTimePicker value={datetime} onChange={setDatetime} />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={70}
              placeholder="e.g. Solve chapter 3 exercises"
              required
            />
            <span className="text-xs text-right text-muted-foreground">{title.length}/70</span>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Description</Label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={1500}
              placeholder="Describe the task details…"
              rows={6}
              required
              className="w-full resize-y rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-base outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30"
            />
            <span className="text-xs text-right text-muted-foreground">{description.length}/1500</span>
          </div>

          <Button
            type="submit"
            disabled={loading || !subjectId || !title.trim() || !description.trim() || !datetime}
            className="gap-1.5 self-end"
          >
            {loading && <Loader2 className="size-4 animate-spin" />}
            Save
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function toDateTimeInput(datetime: Date): string {
  const y = datetime.getFullYear()
  const m = String(datetime.getMonth() + 1).padStart(2, "0")
  const d = String(datetime.getDate()).padStart(2, "0")
  const h = String(datetime.getHours()).padStart(2, "0")
  const min = String(datetime.getMinutes()).padStart(2, "0")
  return `${y}-${m}-${d}T${h}:${min}`
}