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
import { ErrorBox } from "@/components/ui/error-box"
import { GatedTooltip } from "@/components/admin/gated-tooltip"
import { errorMessage } from "@/lib/errors"
import { cn } from "@/lib/utils"
import {
  adminClearGlobalUserCache,
  adminForceGeneratePendingFeeds,
  adminNukeRedis,
} from "@/lib/api/admin"

interface DevToolButtonProps {
  label: string
  variant?: "outline" | "destructive"
  confirm?: {
    title: string
    description: string
    confirmLabel: string
  }
  disabled?: boolean
  tooltip?: string
  onRun: () => Promise<string>
}

function DevToolButton({
  label,
  variant = "outline",
  confirm,
  disabled = false,
  tooltip,
  onRun,
}: DevToolButtonProps) {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)

  async function run() {
    if (disabled) return
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

  const trigger = (
    <Button
      variant={variant}
      size="sm"
      disabled={disabled || loading}
      onClick={() => (confirm ? setConfirmOpen(true) : run())}
      className={cn("gap-1.5", disabled && "pointer-events-none opacity-50")}
    >
      {loading && <Loader2 className="size-3.5 animate-spin" />}
      Run
    </Button>
  )

  return (
    <>
      <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2.5">
        <span className={cn("text-sm font-medium", disabled && "text-muted-foreground")}>
          {label}
        </span>

        {disabled && tooltip ? (
          <GatedTooltip label={tooltip}>{trigger}</GatedTooltip>
        ) : (
          trigger
        )}
      </div>

      {!disabled && message && (
        message.ok ? (
          <p className="text-sm text-green-400 bg-green-500/10 border border-green-500/25 rounded-md px-3 py-2">
            {message.text}
          </p>
        ) : (
          <ErrorBox>{message.text}</ErrorBox>
        )
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

export function DevTools({ isSuperadmin }: { isSuperadmin: boolean }) {
  return (
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
        disabled={!isSuperadmin}
        tooltip="you don't look like a superadmin!"
      />
    </div>
  )
}