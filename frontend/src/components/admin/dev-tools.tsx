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
import { ApiError } from "@/lib/api/client"
import {
  adminClearGlobalUserCache,
  adminForceGeneratePendingFeeds,
  adminNukeRedis,
} from "@/lib/api/admin"

function errorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    const body = err.body as { message?: string } | null
    return body?.message ?? "Something went wrong. Please try again."
  }
  return "Something went wrong. Please try again."
}

interface DevToolButtonProps {
  label: string
  variant?: "outline" | "destructive"
  confirm?: {
    title: string
    description: string
    confirmLabel: string
  }
  onRun: () => Promise<string>
}

function DevToolButton({ label, variant = "outline", confirm, onRun }: DevToolButtonProps) {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)

  async function run() {
    setLoading(true)
    setMessage(null)

    try {
      const text = await onRun()
      setMessage({ ok: true, text })
    } catch (err) {
      setMessage({ ok: false, text: errorMessage(err) })
    } finally {
      setLoading(false)
      setConfirmOpen(false)
    }
  }

  return (
    <>
      <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2.5">
        <span className="text-sm font-medium">{label}</span>

        <Button
          variant={variant}
          size="sm"
          disabled={loading}
          onClick={() => (confirm ? setConfirmOpen(true) : run())}
          className="gap-1.5"
        >
          {loading && <Loader2 className="size-3.5 animate-spin" />}
          Run
        </Button>
      </div>

      {message && (
        <p
          className={
            message.ok
              ? "text-sm text-green-400 bg-green-500/10 border border-green-500/25 rounded-md px-3 py-2"
              : "text-sm text-red-400 bg-red-500/10 border border-red-500/25 rounded-md px-3 py-2"
          }
        >
          {message.text}
        </p>
      )}

      {confirm && (
        <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{confirm.title}</DialogTitle>
              <DialogDescription>{confirm.description}</DialogDescription>
            </DialogHeader>
            <Button variant="destructive" onClick={run} disabled={loading} className="gap-1.5">
              {loading && <Loader2 className="size-4 animate-spin" />}
              {confirm.confirmLabel}
            </Button>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}

export function DevTools() {
  return (
    <section className="flex flex-col gap-4 rounded-xl border-2 border-dashed border-green-500/50 bg-green-500/5 p-5">
      <h2 className="text-sm font-semibold text-green-500">Dev Tools</h2>

      <div className="flex max-w-xl flex-col gap-2">
        <DevToolButton label="Clear global user cache" onRun={adminClearGlobalUserCache} />
        <DevToolButton
          label="Force generate pending feeds"
          onRun={adminForceGeneratePendingFeeds}
        />
        <DevToolButton
          label="Nuke Redis"
          variant="destructive"
          confirm={{
            title: "Nuke Redis?",
            description:
              "This wipes the entire Redis database. Sessions, caches and verification tokens will be lost. This cannot be undone.",
            confirmLabel: "Nuke it",
          }}
          onRun={adminNukeRedis}
        />
      </div>
    </section>
  )
}