"use client"

import { Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { deleteClass } from "@/lib/api/calendar"

interface DeleteClassDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  subjectName: string
  classId: string
  onDeleted: () => void
}

export function DeleteClassDialog({ open, onOpenChange, subjectName, classId, onDeleted }: DeleteClassDialogProps) {
  async function handleDelete() {
    try {
      await deleteClass(classId)
      onDeleted()
      onOpenChange(false)
    } catch {
      // error handled silently for now
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
          <Button variant="destructive" onClick={handleDelete} className="gap-1.5">
            <Trash2 className="size-4" />
            Delete
          </Button>

      </DialogContent>
    </Dialog>
  )
}
