"use client"

import { useEffect, useState } from "react"
import { Loader2, TriangleAlert } from "lucide-react"
import { toast } from "sonner"
import { getHolidaySettings, setHolidayAutoCancel } from "@/lib/api/holidays"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { errorMessage } from "@/lib/errors"
import { ErrorBox } from "@/components/ui/error-box"
import { LoadingState } from "@/components/ui/loading"

export function AutoCancelHolidaysSettings() {
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
      toast.success(next ? "Automatic holiday cancellation is now enabled." : "Automatic holiday cancellation is now disabled.")
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
        <h3 className="text-xl font-semibold tracking-tight">Automatic holiday cancellations</h3>
        <p className="text-sm text-muted-foreground">
          When enabled, days that are public holidays in your country show up as &quot;day off&quot; in the
          calendar and are excluded from your class calendar feeds. You can still un-cancel any individual day.
        </p>
      </div>

      <div className="flex items-center justify-between gap-4 p-4 border rounded-lg border-border bg-background">
        <Label htmlFor="auto-cancel-holidays-toggle" className="text-sm font-medium text-foreground">
          Auto-cancel public holidays
        </Label>
        {toggling ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Switch
            id="auto-cancel-holidays-toggle"
            checked={enabled ?? false}
            onCheckedChange={handleToggle}
            aria-label="Enable or disable automatic holiday cancellation"
          />
        )}
      </div>

      {country ? (
        <p className="text-sm text-muted-foreground">
          Holidays are based on <span className="font-medium text-foreground">{country}</span>, determined
          from your timezone.
        </p>
      ) : (
        <Alert>
          <TriangleAlert />
          <AlertTitle>Country not detected</AlertTitle>
          <AlertDescription>
            We couldn&apos;t determine a country from your timezone, so automatic holiday cancellation isn&apos;t
            available yet. Make sure a valid timezone is set on your account.
          </AlertDescription>
        </Alert>
      )}

      {error && <ErrorBox>{error}</ErrorBox>}
    </div>
  )
}