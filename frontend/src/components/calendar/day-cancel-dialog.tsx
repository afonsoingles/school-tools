"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select"
import { cancelDay } from "@/lib/api/calendar"
import { ErrorBox } from "@/components/ui/error-box"
import { formatDateDdMmYyyy } from "@/lib/date-time"
import { REASON_LABELS } from "./constants"

const REASON_MESSAGE_KEYS: Record<string, string> = {
  break: "reasons.break",
  public_holiday: "reasons.publicHoliday",
  other: "reasons.other",
}

interface DayCancelDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  date: string
  onCancelled: () => void
}

export function DayCancelDialog({ open, onOpenChange, date, onCancelled }: DayCancelDialogProps) {
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
    if (!date || !reason) return

    setLoading(true)
    setError(null)

    try {
      await cancelDay(formatDateDdMmYyyy(date), reason, note.trim() || undefined)
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
    <Dialog open={open} onOpenChange={(next) => { if (!next) reset(); onOpenChange(next) }}>
      <DialogContent className="sm:max-w-xs gap-3">
        <DialogHeader className="gap-1">
          <DialogTitle className="text-base">{t("cancelDay")}</DialogTitle>
        </DialogHeader>

        <Select value={reason} onValueChange={(v) => setReason(String(v))}>
          <SelectTrigger className="h-9 text-sm">
            {reason
              ? reasonLabel(reason)
              : <span className="text-muted-foreground">{t("reasons.field")}</span>}
          </SelectTrigger>
          <SelectContent>
            {Object.keys(REASON_LABELS).map((value) => (
              <SelectItem key={value} value={value} label={reasonLabel(value)}>{reasonLabel(value)}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {reason === "other" && (
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={200}
            required
            placeholder={t("note.required")}
            className="h-9 w-full rounded-md border border-input bg-transparent px-2.5 text-sm outline-hidden placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        )}

        {error && (
          <ErrorBox>{error}</ErrorBox>
        )}

        <Button
          variant="destructive"
          size="sm"
          onClick={handleCancel}
          disabled={loading || !reason}
          className="w-full gap-1.5"
        >
          {loading && <Loader2 className="size-4 animate-spin" />}
          {t("cancelDay")}
        </Button>
      </DialogContent>
    </Dialog>
  )
}