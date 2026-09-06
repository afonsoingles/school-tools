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
import { SubjectSelect } from "@/components/ui/subject-select"
import { errorMessage } from "@/lib/errors"
import { createHomework } from "@/lib/api/homework"
import { useTimezone } from "@/components/layout/timezone-provider"
import { toDateTimeInput } from "@/lib/date-time"
import type { Subject } from "@/types"
import { toast } from "sonner"

interface CreateHomeworkDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  subjects: Subject[]
  onCreated: () => void
}

export function CreateHomeworkDialog({
  open,
  onOpenChange,
  subjects,
  onCreated,
}: CreateHomeworkDialogProps) {
  const [subjectId, setSubjectId] = useState("")
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [datetime, setDatetime] = useState<Date | undefined>(undefined)
  const [loading, setLoading] = useState(false)

  const timezone = useTimezone()

  const dueDate = datetime ? toDateTimeInput(datetime, timezone) : ""

  function reset() {
    setSubjectId("")
    setTitle("")
    setDescription("")
    setDatetime(undefined)
  }

  function handleOpenChange(next: boolean, details?: { reason?: string }) {
    if (!next) {
      if (details?.reason === "outside-press") return
      reset()
    }
    onOpenChange(next)
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!subjectId || !title.trim() || !description.trim() || !datetime) return

    setLoading(true)

    try {
      await createHomework({
        subject_id: subjectId,
        title: title.trim(),
        description: description.trim(),
        due_date: dueDate,
      })
      onCreated()
      handleOpenChange(false)
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
            <DialogTitle>New homework</DialogTitle>
            <DialogDescription>Create a new homework task.</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <SubjectSelect value={subjectId} onValueChange={setSubjectId} subjects={subjects} />

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
              placeholder="Describe the details…"
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
            Create
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}