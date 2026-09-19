"use client"

import { useEffect, useState } from "react"
import {
  CalendarPlus,
  CalendarX,
  Check,
  CircleHelp,
  Copy,
  Loader2,
  RefreshCcw,
  TriangleAlert,
} from "lucide-react"
import { toast } from "sonner"
import { useTranslations } from "next-intl"
import { FaApple } from "react-icons/fa6"
import { FcGoogle } from "react-icons/fc"
import {
  getCalendarFeeds,
  isFeedDisabled,
  regenerateCalendarFeeds,
  setCalendarFeedStatus,
} from "@/lib/api/calendar-feeds"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ErrorBox } from "@/components/ui/error-box"
import { LoadingState } from "@/components/ui/loading"
import { errorMessage } from "@/lib/errors"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Switch } from "@/components/ui/switch"
import type { CalendarFeeds } from "@/types"

function toWebcal(url: string): string {
  return url.replace(/^https?:\/\//i, "webcal://")
}

function toGoogleAdd(url: string): string {
  return `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(toWebcal(url))}`
}

type FeedKey = keyof CalendarFeeds

const feedRows = [
  {
    key: "classes" as FeedKey,
    summaryKey: "feeds.classes.summary",
    descriptionKey: "feeds.classes.description",
  },
  {
    key: "evaluations" as FeedKey,
    summaryKey: "feeds.evaluations.summary",
    descriptionKey: "feeds.evaluations.description",
  },
] as const

export function CalendarFeedSettings() {
  const t = useTranslations("settings.calendarFeeds")
  const [feeds, setFeeds] = useState<CalendarFeeds | null>(null)
  const [enabled, setEnabled] = useState<boolean | null>(null)
  const [toggling, setToggling] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [copiedKey, setCopiedKey] = useState<FeedKey | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getCalendarFeeds()
      .then((next) => {
        setFeeds(next)
        setEnabled(true)
      })
      .catch((err) => {
        if (isFeedDisabled(err)) {
          setEnabled(false)
        } else {
          setLoadError(errorMessage(err))
        }
      })
      .finally(() => setLoading(false))
  }, [])

  async function handleToggle(next: boolean) {
    setToggling(true)

    try {
      await setCalendarFeedStatus(next)
      setEnabled(next)
      setFeeds(next ? await getCalendarFeeds() : null)
      toast.success(next ? t("enabledSuccess") : t("disabledSuccess"))
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setToggling(false)
    }
  }

  async function handleCopy(key: FeedKey) {
    if (!feeds) return

    try {
      await navigator.clipboard.writeText(feeds[key])
      setCopiedKey(key)
      setTimeout(() => setCopiedKey((current) => (current === key ? null : current)), 2000)
    } catch {
      setError(t("copyError"))
    }
  }

  async function handleRegenerate() {
    setRegenerating(true)
    setError(null)

    try {
      const next = await regenerateCalendarFeeds()
      setFeeds(next)
      setConfirmOpen(false)
      toast.success(t("regenerateSuccess"), {
        description: t("regenerateSuccessDescription"),
      })
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setRegenerating(false)
    }
  }

  if (loading) {
    return (
      <LoadingState />
    )
  }

  if (loadError) {
    return <ErrorBox>{loadError}</ErrorBox>
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
        <Label htmlFor="calendar-feeds-toggle" className="text-sm font-medium text-foreground">
          {t("enabled")}
        </Label>
        {toggling ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Switch
            id="calendar-feeds-toggle"
            checked={enabled ?? false}
            onCheckedChange={handleToggle}
            aria-label={t("toggleAriaLabel")}
          />
        )}
      </div>

      {enabled ? (
        <>
          <div className="flex flex-col border divide-y rounded-lg divide-border border-border bg-background">
            {feedRows.map((row) => {
              const summary = t(row.summaryKey)
              const description = t(row.descriptionKey)

              return (
                <div key={row.key} className="flex flex-col gap-2 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-medium">{summary}</span>
                      <p className="text-xs text-muted-foreground">{description}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Popover>
                        <PopoverTrigger
                          render={
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1.5"
                              aria-label={t("addToCalendarAriaLabel", { feed: summary })}
                            >
                              <CalendarPlus className="size-3.5" />
                              {t("addToCalendar")}
                            </Button>
                          }
                        />
                        <PopoverContent align="end" className="w-44 p-1.5">
                          <a
                            href={toWebcal(feeds?.[row.key] ?? "")}
                            className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-foreground/5"
                          >
                            <FaApple className="size-4" />
                            Apple Calendar
                          </a>
                          <a
                            href={toGoogleAdd(feeds?.[row.key] ?? "")}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-foreground/5"
                          >
                            <FcGoogle className="size-4" />
                            Google Calendar
                          </a>
                        </PopoverContent>
                      </Popover>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleCopy(row.key)}
                        className="hover:bg-foreground/10!"
                        aria-label={t("copyLinkAriaLabel", { feed: summary })}
                      >
                        {copiedKey === row.key ? (
                          <Check className="size-3.5" />
                        ) : (
                          <Copy className="size-3.5" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <Input
                    readOnly
                    value={feeds?.[row.key] ?? ""}
                    className="font-mono text-xs rounded-sm h-7"
                  />
                </div>
              )
            })}
          </div>

          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => {
                setError(null)
                setConfirmOpen(true)
              }}
              className="gap-1.5"
              disabled={regenerating}
            >
              {regenerating ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RefreshCcw className="size-4" />
              )}
              {t("regenerateLinks")}
            </Button>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center gap-2 p-8 text-center bg-background">
          <CalendarX className="size-8 shrink-0 text-muted-foreground" />
          <p className="text-base font-medium">{t("pausedTitle")}</p>
          <p className="max-w-md text-sm text-muted-foreground">
            {t("pausedDescription")}
          </p>
        </div>
      )}

      {error && <ErrorBox>{error}</ErrorBox>}

{enabled && (
        <>
          <Alert>
            <TriangleAlert />
            <AlertTitle>{t("privacyWarning")}</AlertTitle>
            <AlertDescription>
              {t("privacyWarningDescription")}
            </AlertDescription>
          </Alert>

          <div className="flex flex-col gap-1 text-sm">
          <p className="flex items-center gap-2 text-foreground">
            <CircleHelp className="size-4 shrink-0 text-muted-foreground" />
            {t("faqTitle")}
          </p>
          <p className="pl-6 text-muted-foreground">{t("faqAnswer1")}</p>
          <p className="pl-6 text-muted-foreground">{t("faqAnswer2")}</p>
        </div>
      </>
      )}

      <Dialog
        open={confirmOpen}
        onOpenChange={(next) => {
          if (!next) setError(null)
          setConfirmOpen(next)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("regenerateDialog.title")}</DialogTitle>
            <DialogDescription>
              {t("regenerateDialog.description")}
            </DialogDescription>
          </DialogHeader>
          <Button
            variant="destructive"
            onClick={handleRegenerate}
            disabled={regenerating}
            className="gap-1.5"
          >
            {regenerating ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <RefreshCcw className="size-4" />
            )}
            {t("regenerateLinks")}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  )
}