"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { useTranslations, useLocale } from "next-intl"
import { AlertTriangle, Loader2, ShieldAlert } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { errorMessage } from "@/lib/errors"
import { getMyDeletionRequest, requestAccountDeletion } from "@/lib/api/deletions"
import { cn } from "@/lib/utils"
import type { DeletionRequest } from "@/types"

const textareaClasses =
  "w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm transition-colors outline-hidden placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 dark:bg-input/30"

function formatDate(iso: string | null, locale: string): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleString(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

export function DangerZoneSection() {
  const t = useTranslations("settings.dangerZone")
  const tCommon = useTranslations("common")
  const locale = useLocale()
  const [activeRequest, setActiveRequest] = useState<DeletionRequest | null>(null)
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState("")
  const [confirmed, setConfirmed] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    getMyDeletionRequest()
      .then(setActiveRequest)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  function handleOpenChange(next: boolean) {
    if (submitting) return
    if (!next) {
      setReason("")
      setConfirmed(false)
    }
    setOpen(next)
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!confirmed) {
      toast.error(t("confirmError"))
      return
    }

    setSubmitting(true)
    try {
      await requestAccountDeletion(reason.trim())
      toast.success(t("submitSuccess"))
      window.location.assign("/api/auth/clear-session")
    } catch (err) {
      toast.error(errorMessage(err))
      setSubmitting(false)
    }
  }

  return (
    <Card className="border-destructive/40">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <ShieldAlert className="size-4" />
          {t("title")}
        </CardTitle>
        <CardDescription>
          {t("description")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            {t("loading")}
          </div>
        ) : activeRequest ? (
          <Alert variant="destructive">
            <AlertTriangle />
            <AlertTitle>{t("requestInProgress")}</AlertTitle>
            <AlertDescription>
              <p>
                {t("requestDescription")}
              </p>
              <p className="text-xs">
                {t("requestedAt", { date: formatDate(activeRequest.requested_at, locale) })}
                {activeRequest.status === "approved" ? t("purgeSchedule") : ""}
              </p>
              <p className="text-xs">
                {t("reverseInstructions")}
              </p>
            </AlertDescription>
          </Alert>
        ) : (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              {t("deleteDescription")}
            </p>
            <Button variant="destructive" className="gap-1.5" onClick={() => setOpen(true)}>
              <AlertTriangle className="size-4" />
              {t("deleteButton")}
            </Button>
          </div>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-md:max-h-[calc(100dvh-2rem)] max-md:overflow-y-auto">
          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{t("dialogTitle")}</DialogTitle>
              <DialogDescription>
                {t("dialogDescription")}
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="deletion-reason">{t("reasonLabel")}</Label>
              <textarea
                id="deletion-reason"
                className={cn(textareaClasses, "min-h-24 resize-y")}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={t("reasonPlaceholder")}
                maxLength={500}
              />
            </div>

            <div className="flex items-center justify-between gap-4 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2.5">
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium">{t("confirmIrreversible")}</span>
                <span className="text-xs text-muted-foreground">
                  {t("confirmDescription")}
                </span>
              </div>
              <Switch checked={confirmed} onCheckedChange={setConfirmed} aria-label={t("confirmAriaLabel")} />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => handleOpenChange(false)}
                disabled={submitting}
              >
                {tCommon("actions.cancel")}
              </Button>
              <Button type="submit" variant="destructive" disabled={submitting || !confirmed} className="gap-1.5">
                {submitting ? <Loader2 className="size-4 animate-spin" /> : <AlertTriangle className="size-4" />}
                {t("requestButton")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  )
}