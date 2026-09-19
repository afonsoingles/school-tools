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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select"
import type { ClassEvent } from "@/types"
import { cancelClass } from "@/lib/api/calendar"
import { Label } from "@/components/ui/label"
import { ErrorBox } from "@/components/ui/error-box"
import { formatDateDdMmYyyy } from "@/lib/date-time"
import { REASON_LABELS } from "./constants"

const REASON_MESSAGE_KEYS: Record<string, string> = {
  break: "reasons.break",
  public_holiday: "reasons.publicHoliday",
  other: "reasons.other",
}

interface CancelClassDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  cls: ClassEvent | null
  date: string
  onCancelled: () => void
}

export function CancelClassDialog({ open, onOpenChange, cls, date, onCancelled }: CancelClassDialogProps) {
  const [reason, setReason] = useState<string>("")
  const [note, setNote] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const t = useTranslations("calendar")

  function reasonLabel(value: string): string {
    const key = REASON_MESSAGE_KEYS[value]
    return key ? (t.has(key) ? t(key) : value) : value
  }

  function reset() {
    setReason("")
    setNote("")
    setError(null)
  }

  async function handleCancel() {
    if (!cls || !reason) return

    setLoading(true)
    setError(null)

    try {
      await cancelClass(cls.id, formatDateDdMmYyyy(date), reason, note.trim() || undefined)
      onCancelled()
      onOpenChange(false)
      reset()
    } catch (err) {
      const body = (err as { body?: { message?: string } }).body
      setError(body?.message ?? t("errorUnknown"))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) { reset(); onOpenChange(next) } else onOpenChange(next) }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("cancelClass")}</DialogTitle>
          <DialogDescription>
            {t("cancelClassDescription", { date })}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-1.5">
          <Label>{t("reasons.field")}</Label>
          <Select value={reason} onValueChange={(v) => setReason(String(v))}>
            <SelectTrigger>
            {reason
              ? reasonLabel(reason)
              : <span className="text-muted-foreground">{t("reasons.select")}</span>}
          </SelectTrigger>
          <SelectContent>
            {Object.keys(REASON_LABELS).map((value) => (
              <SelectItem key={value} value={value} label={reasonLabel(value)}>{reasonLabel(value)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        </div>

        {reason === "other" && (
          <div className="flex flex-col gap-1.5">
            <Label>{t("note.label")}</Label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={500}
              rows={3}
              required
              placeholder={t("note.describe")}
              className="w-full resize-y rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-base outline-hidden placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30"
            />
          </div>
        )}

        {error && (
          <ErrorBox>{error}</ErrorBox>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="destructive" onClick={handleCancel} disabled={loading || !reason} className="gap-1.5">
            {loading && <Loader2 className="size-4 animate-spin" />}
            {t("cancelClass")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
