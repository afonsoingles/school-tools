"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { Loader2 } from "lucide-react"

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
import { deleteEvaluation } from "@/lib/api/evaluations"
import { evaluationTypeLabel } from "@/lib/evaluations"
import type { Evaluation } from "@/types"

interface DeleteEvaluationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  evaluation: Evaluation | null
  subjectName: string
  onDeleted: () => void
}

export function DeleteEvaluationDialog({
  open,
  onOpenChange,
  evaluation,
  subjectName,
  onDeleted,
}: DeleteEvaluationDialogProps) {
  const t = useTranslations("evaluations")
  const tCommon = useTranslations("common")
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
          <DialogTitle>{t("delete.title")}</DialogTitle>
          <DialogDescription>
            {t("delete.description", {
              type: evaluation ? evaluationTypeLabel(t, evaluation.type) : t("evaluation"),
              subject: subjectName || t("delete.thisSubject"),
            })}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <ErrorBox>{error}</ErrorBox>
        )}

          <Button variant="destructive" onClick={handleDelete} disabled={deleting} className="gap-1.5">
            {deleting && <Loader2 className="size-4 animate-spin" />}
            {tCommon("actions.delete")}
          </Button>
      </DialogContent>
    </Dialog>
  )
}