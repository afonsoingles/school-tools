"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { useTranslations } from "next-intl"
import { Check, Copy, KeyRound, Loader2, Plus, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { LoadingState } from "@/components/ui/loading"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { errorMessage } from "@/lib/errors"
import { createApiKey, getApiKeys, revokeApiKey } from "@/lib/api/api-keys"
import { formatDateDdMmYyyy } from "@/lib/date-time"
import type { ApiKey } from "@/types"

function maskPrefix(prefix: string) {
  return prefix + "••••••••••••••••••"
}

function formatDate(iso: string): string {
  return formatDateDdMmYyyy(iso)
}

export function ApiKeysSection() {
  const t = useTranslations("settings.apiKeys")
  const tCommon = useTranslations("common")
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [createOpen, setCreateOpen] = useState(false)
  const [createName, setCreateName] = useState("")
  const [createError, setCreateError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  const [revealKey, setRevealKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const [revokeTarget, setRevokeTarget] = useState<ApiKey | null>(null)
  const [revoking, setRevoking] = useState(false)

  useEffect(() => {
    getApiKeys()
      .then(setKeys)
      .catch((err) => setLoadError(errorMessage(err)))
      .finally(() => setLoading(false))
  }, [])

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault()
    setCreateError(null)
    const name = createName.trim()
    if (name.length < 2 || name.length > 50) {
      setCreateError(t("validation"))
      return
    }
    setCreating(true)
    try {
      const { key, rawKey } = await createApiKey(name)
      setKeys((prev) => [key, ...prev])
      setCreateName("")
      setCreateOpen(false)
      setRevealKey(rawKey)
      setCopied(false)
    } catch (err) {
      setCreateError(errorMessage(err))
    } finally {
      setCreating(false)
    }
  }

  async function handleCopy() {
    if (!revealKey) return
    try {
      await navigator.clipboard.writeText(revealKey)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error(t("revealDialog.copyError"))
    }
  }

  async function handleRevoke() {
    if (!revokeTarget) return
    setRevoking(true)
    try {
      await revokeApiKey(revokeTarget.id)
      setKeys((prev) => prev.map((k) => (k.id === revokeTarget.id ? { ...k, revoked: true } : k)))
      setRevokeTarget(null)
      toast.success(t("revokeDialog.success"))
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setRevoking(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h3 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
            <KeyRound className="size-5 text-muted-foreground" />
            {t("title")}
          </h3>
          <p className="text-sm text-muted-foreground">{t("description")}</p>
        </div>
        <Button
          size="sm"
          onClick={() => {
            setCreateName("")
            setCreateError(null)
            setCreateOpen(true)
          }}
          className="gap-1.5"
        >
          <Plus className="size-3.5" />
          {t("createAriaLabel")}
        </Button>
      </div>

      {loading ? (
        <LoadingState />
      ) : loadError ? (
        <p className="text-sm text-destructive">{loadError}</p>
      ) : keys.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("emptyState")}</p>
      ) : (
        <div className="rounded-lg border border-border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("table.name")}</TableHead>
                <TableHead>{t("table.key")}</TableHead>
                <TableHead>{t("table.created")}</TableHead>
                <TableHead>{t("table.lastUsed")}</TableHead>
                <TableHead className="w-[50px]"><span className="sr-only">{t("table.revoke")}</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {keys.map((k) => (
                <TableRow key={k.id}>
                  <TableCell className="font-medium">{k.name}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {maskPrefix(k.prefix)}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDate(k.created_at)}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {k.last_used_at ? formatDate(k.last_used_at) : t("table.never")}
                  </TableCell>
                  <TableCell className="text-right">
                    {k.revoked ? (
                      <span className="text-xs text-muted-foreground">{t("table.revoked")}</span>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setRevokeTarget(k)}
                        className="hover:bg-foreground/10!"
                        aria-label={`${t("table.revoke")} ${k.name}`}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("createDialog.title")}</DialogTitle>
            <DialogDescription>{t("createDialog.description")}</DialogDescription>
          </DialogHeader>
          <form id="create-api-key-form" className="flex flex-col gap-3" onSubmit={handleCreate}>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="api-key-name">{t("createDialog.label")}</Label>
              <Input
                id="api-key-name"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder={t("createDialog.placeholder")}
                maxLength={50}
                autoFocus
              />
            </div>
            {createError && <p className="text-sm text-destructive">{createError}</p>}
          </form>
          <DialogFooter>
            <Button
              type="submit"
              form="create-api-key-form"
              disabled={creating}
              className="gap-1.5"
            >
              {creating ? <Loader2 className="size-4 animate-spin" /> : null}
              {tCommon("actions.create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={revealKey !== null} onOpenChange={(next) => { if (!next) setRevealKey(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("revealDialog.title")}</DialogTitle>
            <DialogDescription>
              {t("revealDialog.description")}
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2 rounded-md border border-border bg-background p-3">
            <code className="flex-1 truncate text-xs font-mono text-foreground">{revealKey}</code>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleCopy}
              className="hover:bg-foreground/10!"
              aria-label={t("revealDialog.copyAriaLabel")}
            >
              {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevealKey(null)}>
              {tCommon("actions.done")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={revokeTarget !== null} onOpenChange={(next) => { if (!next) setRevokeTarget(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("revokeDialog.title", { name: revokeTarget?.name ?? "" })}</DialogTitle>
            <DialogDescription>
              {t("revokeDialog.description")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="destructive" onClick={handleRevoke} disabled={revoking} className="gap-1.5">
              {revoking ? <Loader2 className="size-4 animate-spin" /> : null}
              {t("table.revoke")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}