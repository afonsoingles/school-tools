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
      setError(body?.message ?? "Something went wrong.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) { reset(); onOpenChange(next) } else onOpenChange(next) }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancel class</DialogTitle>
          <DialogDescription>
            This will cancel the class on {date}.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-1.5">
          <Label>Reason</Label>
          <Select value={reason} onValueChange={(v) => setReason(String(v))}>
            <SelectTrigger>
            {reason
              ? REASON_LABELS[reason] ?? reason
              : <span className="text-muted-foreground">Select a reason</span>}
          </SelectTrigger>
          <SelectContent>
            {Object.entries(REASON_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value} label={label}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        </div>

        {reason === "other" && (
          <div className="flex flex-col gap-1.5">
            <Label>Note</Label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={500}
              rows={3}
              required
              placeholder="Describe the reason…"
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
            Cancel class
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
