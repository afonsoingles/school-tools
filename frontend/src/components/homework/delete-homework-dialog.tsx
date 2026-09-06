"use client"

import { useState } from "react"
import { Loader2, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ErrorBox } from "@/components/ui/error-box"
import { errorMessage } from "@/lib/errors"
import { deleteHomework } from "@/lib/api/homework"
import type { Homework } from "@/types"

interface DeleteHomeworkDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  homework: Homework | null
  onDeleted: () => void
}

export function DeleteHomeworkDialog({
  open,
  onOpenChange,
  homework,
  onDeleted,
}: DeleteHomeworkDialogProps) {
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    if (!homework) return

    setDeleting(true)
    setError(null)

    try {
      await deleteHomework(homework.id)
      onDeleted()
      onOpenChange(false)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete {homework?.title || "homework"}?</DialogTitle>
          <DialogDescription>
            This can&apos;t be undone.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <ErrorBox>{error}</ErrorBox>
        )}

        <Button variant="destructive" onClick={handleDelete} disabled={deleting} className="gap-1.5">
          {deleting && <Loader2 className="size-4 animate-spin" />}
          {!deleting && <Trash2 className="size-4" />}
          Delete
        </Button>
      </DialogContent>
    </Dialog>
  )
}