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
import { ApiError } from "@/lib/api/client"
import { deleteHomework } from "@/lib/api/homework"
import type { Homework } from "@/types"

interface DeleteHomeworkDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  homework: Homework | null
  onDeleted: () => void
}

function errorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    const body = err.body as { message?: string } | null
    return body?.message ?? "Something went wrong. Please try again."
  }
  return "Something went wrong. Please try again."
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
          <p className="px-3 py-2 text-sm text-red-400 border rounded-md bg-red-500/10 border-red-500/25">
            {error}
          </p>
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