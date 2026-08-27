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
import { ApiError } from "@/lib/api/client"
import { deleteEvaluation } from "@/lib/api/evaluations"
import type { Evaluation } from "@/types"
import { EVALUATION_TYPE_LABELS } from "./constants"

interface DeleteEvaluationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  evaluation: Evaluation | null
  subjectName: string
  onDeleted: () => void
}

function errorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    const body = err.body as { message?: string } | null
    return body?.message ?? "Something went wrong. Please try again."
  }
  return "Something went wrong. Please try again."
}

export function DeleteEvaluationDialog({
  open,
  onOpenChange,
  evaluation,
  subjectName,
  onDeleted,
}: DeleteEvaluationDialogProps) {
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    if (!evaluation) return

    setDeleting(true)
    setError(null)

    try {
      await deleteEvaluation(evaluation.id)
      onDeleted()
      onOpenChange(false)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setError(null)
        onOpenChange(next)
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete evaluation?</DialogTitle>
          <DialogDescription>
            This will remove the {evaluation ? (EVALUATION_TYPE_LABELS[evaluation.type] ?? evaluation.type) : "evaluation"} for {subjectName || "this subject"}. This can&apos;t be undone.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/25 rounded-md px-3 py-2">
            {error}
          </p>
        )}

          <Button variant="destructive" onClick={handleDelete} disabled={deleting} className="gap-1.5">
            {deleting && <Loader2 className="size-4 animate-spin" />}
            Delete
          </Button>
      </DialogContent>
    </Dialog>
  )
}