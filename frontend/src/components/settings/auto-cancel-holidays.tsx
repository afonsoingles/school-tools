"use client"

import { useEffect, useState } from "react"
import { Loader2, TriangleAlert } from "lucide-react"
import { toast } from "sonner"
import { useTranslations } from "next-intl"
import { getHolidaySettings, setHolidayAutoCancel } from "@/lib/api/holidays"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { errorMessage } from "@/lib/errors"
import { ErrorBox } from "@/components/ui/error-box"
import { LoadingState } from "@/components/ui/loading"

export function AutoCancelHolidaysSettings() {
  const t = useTranslations("settings.autoCancelHolidays")
  const [enabled, setEnabled] = useState<boolean | null>(null)
  const [country, setCountry] = useState<string | null>(null)
  const [toggling, setToggling] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getHolidaySettings()
      .then((res) => {
        setEnabled(res.auto_cancel_enabled)
        setCountry(res.country)
      })
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false))
  }, [])

  async function handleToggle(next: boolean) {
    setToggling(true)
    setError(null)
    try {
      const res = await setHolidayAutoCancel(next)
      setEnabled(res.auto_cancel_enabled)
      setCountry(res.country)
      toast.success(next ? t("enabledSuccess") : t("disabledSuccess"))
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setToggling(false)
    }
  }

  if (loading) {
    return <LoadingState />
  }

  return (
    <div className="flex flex-col gap-4 mt-1">
      <div className="flex flex-col gap-1">
        <h3 className="text-xl font-semibold tracking-tight">{t("title")}</h3>
        <p className="text-sm text-muted-foreground">
          {t("description")}
        </p>
      </div>

      <div className="flex items-center justify-between gap-4 p-4 border rounded-lg border-border bg-background">
        <Label htmlFor="auto-cancel-holidays-toggle" className="text-sm font-medium text-foreground">
          {t("toggleLabel")}
        </Label>
        {toggling ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Switch
            id="auto-cancel-holidays-toggle"
            checked={enabled ?? false}
            onCheckedChange={handleToggle}
            aria-label={t("toggleAriaLabel")}
          />
        )}
      </div>

      {country ? (
        <p className="text-sm text-muted-foreground">
          {t.rich("countryInfo", {
            country,
            strong: (chunks) => <span className="font-medium text-foreground">{chunks}</span>,
          })}
        </p>
      ) : (
        <Alert>
          <TriangleAlert />
          <AlertTitle>{t("countryNotDetected")}</AlertTitle>
          <AlertDescription>
            {t("countryNotDetectedDescription")}
          </AlertDescription>
        </Alert>
      )}

      {error && <ErrorBox>{error}</ErrorBox>}
    </div>
  )
}