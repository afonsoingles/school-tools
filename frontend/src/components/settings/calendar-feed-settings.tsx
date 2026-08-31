"use client"

import { useEffect, useState } from "react"
import { CalendarPlus, Check, CircleHelp, Copy, Loader2, RefreshCcw, TriangleAlert } from "lucide-react"
import { toast } from "sonner"
import { FaApple } from "react-icons/fa6"
import { FcGoogle } from "react-icons/fc"

import { ApiError } from "@/lib/api/client"
import { getCalendarFeeds, regenerateCalendarFeeds } from "@/lib/api/calendar-feeds"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import type { CalendarFeeds } from "@/types"

function errorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    const body = err.body as { message?: string } | null
    return body?.message ?? "Something went wrong. Please try again."
  }
  return "Something went wrong. Please try again."
}

function toWebcal(url: string): string {
  return url.replace(/^https?:\/\//i, "webcal://")
}

function toGoogleAdd(url: string): string {
  return `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(toWebcal(url))}`
}

type FeedKey = keyof CalendarFeeds

const feedRows: { key: FeedKey; summary: string; description: string }[] = [
  {
    key: "classes",
    summary: "Classes",
    description: "Your class schedule.",
  },
  {
    key: "evaluations",
    summary: "Evaluations",
    description: "Exams, quizzes and assignments.",
  },
]

export function CalendarFeedSettings() {
  const [feeds, setFeeds] = useState<CalendarFeeds | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [copiedKey, setCopiedKey] = useState<FeedKey | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getCalendarFeeds()
      .then(setFeeds)
      .catch((err) => setLoadError(errorMessage(err)))
      .finally(() => setLoading(false))
  }, [])

  async function handleCopy(key: FeedKey) {
    if (!feeds) return

    try {
      await navigator.clipboard.writeText(feeds[key])
      setCopiedKey(key)
      setTimeout(() => setCopiedKey((current) => (current === key ? null : current)), 2000)
    } catch {
      setError("Couldn't copy the link. Copy it manually.")
    }
  }

  async function handleRegenerate() {
    setRegenerating(true)
    setError(null)

    try {
      const next = await regenerateCalendarFeeds()
      setFeeds(next)
      setConfirmOpen(false)
      toast.success("Calendar links regenerated.", {
        description: "Calendar links were regenerated successfully.",
      })
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setRegenerating(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
      </div>
    )
  }

  if (loadError) {
    return (
      <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/25 rounded-md px-3 py-2">
        {loadError}
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h3 className="text-xl font-semibold tracking-tight">Calendar Feeds</h3>
        <p className="text-sm text-muted-foreground">
          Calendar feeds let you subscribe to your schedule in any calendar app, so your events stay
          up to date automatically.
        </p>
      </div>

      <div className="flex flex-col divide-y divide-border rounded-lg border border-border bg-background">
        {feedRows.map((row) => (
          <div key={row.key} className="flex flex-col gap-2 p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium">{row.summary}</span>
                <p className="text-xs text-muted-foreground">{row.description}</p>
              </div>
              <div className="flex items-center gap-1">
                <Popover>
                  <PopoverTrigger
                    render={
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        aria-label={`Add ${row.summary} to your calendar`}
                      >
                        <CalendarPlus className="size-3.5" />
                        Add to calendar
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
                  aria-label={`Copy ${row.summary} link`}
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
              className="h-7 rounded-sm font-mono text-xs"
            />
          </div>
        ))}
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
          Regenerate links
        </Button>
      </div>

      {error && (
        <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/25 rounded-md px-3 py-2">
          {error}
        </p>
      )}

      <Alert>
        <TriangleAlert />
        <AlertTitle>Keep your links private</AlertTitle>
        <AlertDescription>
          Calendar feeds authenticate by URL alone. This means thatanyone who has the link can view all your events,
          so don&apos;t share it.
        </AlertDescription>
      </Alert>

      <div className="flex flex-col gap-1 text-sm">
        <p className="flex items-center gap-2 text-foreground">
          <CircleHelp className="size-4 shrink-0 text-muted-foreground" />
          Why is my calendar feed not updated?
        </p>
        <p className="pl-6 text-muted-foreground">The system regenerates your calendar feed every 5 minutes, so it may take a few minutes for changes to appear in your calendar app.</p>
        <p className="pl-6 text-muted-foreground"> Aditionally, some calendar apps cache the feed for a longer period of time (Google Calendar caches can last up to 24 hours, for example). Some have the option to manually refresh the feed, so check your app&apos;s settings.</p>
      </div>

      <Dialog
        open={confirmOpen}
        onOpenChange={(next) => {
          if (!next) setError(null)
          setConfirmOpen(next)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Regenerate calendar links?</DialogTitle>
            <DialogDescription>
              Calendar apps subscribed to the current links will lose access and stop syncing.
              You&apos;ll need to add the new links again.
            </DialogDescription>
          </DialogHeader>
          <Button
            variant="destructive"
            onClick={handleRegenerate}
            disabled={regenerating}
            className="gap-1.5"
          >
            {regenerating && <Loader2 className="size-4 animate-spin" />}
            Regenerate
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  )
}