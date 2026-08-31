"use client"

import { useState } from "react"
import { Loader2, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ApiError } from "@/lib/api/client"
import { deleteClass } from "@/lib/api/calendar"

interface DeleteClassDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  subjectName: string
  classId: string
  onDeleted: () => void
}

export function DeleteClassDialog({ open, onOpenChange, subjectName, classId, onDeleted }: DeleteClassDialogProps) {
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    setDeleting(true)
    try {
      await deleteClass(classId)
      onDeleted()
      onOpenChange(false)
    } catch (err) {
      const code =
        err instanceof ApiError && (err.body as { code?: string } | null)?.code

      if (code === "class_used_by_evaluation") {
        onOpenChange(false)
        toast.error(
          `This class has one or more evaluations and can't be deleted.`
        )
      }
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete {subjectName} class?</DialogTitle>
          <DialogDescription>
            This will remove all recurring instances of this class from your schedule.
          </DialogDescription>
        </DialogHeader>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleting}
            className="gap-1.5"
          >
            {deleting && <Loader2 className="size-4 animate-spin" />}
            {!deleting && <Trash2 className="size-4 " />}
            Delete
          </Button>

      </DialogContent>
    </Dialog>
  )
}
