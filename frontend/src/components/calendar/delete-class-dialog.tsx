"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
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
  const t = useTranslations("calendar")
  const tActions = useTranslations("common.actions")

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
        toast.error(t("deleteClass.usedByEvaluation"))
      }
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("deleteClass.title", { subject: subjectName })}</DialogTitle>
          <DialogDescription>
            {t("deleteClass.description")}
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
            {tActions("delete")}
          </Button>

      </DialogContent>
    </Dialog>
  )
}
