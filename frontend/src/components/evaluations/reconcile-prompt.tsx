"use client"

import { useEffect, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { toast } from "sonner"
import { Check, Loader2, NotebookPen } from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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
import { errorMessage } from "@/lib/errors"
import { datePart, formatDateWeekday } from "@/lib/date-time"
import { evaluationTypeLabel } from "@/lib/evaluations"
import {
  getTestSheets,
  reconcileTestSheets,
  type PendingReconciliation,
  type TestSheetState,
} from "@/lib/api/test-sheets"

export function ReconcilePrompt() {
  const t = useTranslations("evaluations")
  const tCommon = useTranslations("common")
  const locale = useLocale()
  const [state, setState] = useState<TestSheetState | null>(null)
  const [selected, setSelected] = useState<PendingReconciliation | null>(null)
  const [lined, setLined] = useState("0")
  const [graph, setGraph] = useState("0")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getTestSheets()
      .then(setState)
      .catch(() => {})
  }, [])

  function open(pending: PendingReconciliation) {
    setSelected(pending)
    setLined("0")
    setGraph("0")
  }

  async function submit(useNone: boolean) {
    if (!selected) return
    setSaving(true)
    try {
      const next = await reconcileTestSheets(
        selected.id,
        useNone ? 0 : Number(lined) || 0,
        useNone ? 0 : Number(graph) || 0
      )
      setState(next)
      setSelected(null)
      toast.success(t("reconcile.reconciledSuccess"))
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  if (!state?.enabled || state.pending.length === 0) return null

  return (
    <Card className="mb-4 border-amber-500/40">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <NotebookPen className="size-4 text-amber-500" />
          {t("reconcile.title")}
        </CardTitle>
        <CardDescription>
          {t("reconcile.description")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col divide-y divide-border">
          {state.pending.map((pending) => (
            <li key={pending.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-medium">
                  {pending.subject || t("evaluation")} · {evaluationTypeLabel(t, pending.type)}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatDateWeekday(datePart(pending.date), locale)}
                </span>
              </div>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => open(pending)}>
                <Check className="size-3.5" />
                {t("reconcile.action")}
              </Button>
            </li>
          ))}
        </ul>
      </CardContent>

      <Dialog open={selected !== null} onOpenChange={(next) => !next && !saving && setSelected(null)}>
        <DialogContent>
          <form
            className="flex flex-col gap-4"
            onSubmit={(event) => {
              event.preventDefault()
              submit(false)
            }}
          >
            <DialogHeader>
              <DialogTitle>{t("reconcile.title")}</DialogTitle>
              <DialogDescription>
                {selected?.subject || t("evaluation")} ·{" "}
                {selected ? formatDateWeekday(datePart(selected.date), locale) : ""}
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-wrap items-end gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="reconcile-lined">{t("reconcile.linedUsed")}</Label>
                <Input
                  id="reconcile-lined"
                  type="number"
                  min={0}
                  max={1000}
                  value={lined}
                  onChange={(e) => setLined(e.target.value)}
                  className="w-28"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="reconcile-graph">{t("reconcile.graphUsed")}</Label>
                <Input
                  id="reconcile-graph"
                  type="number"
                  min={0}
                  max={1000}
                  value={graph}
                  onChange={(e) => setGraph(e.target.value)}
                  className="w-28"
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => submit(true)} disabled={saving}>
                {t("reconcile.noSheetsUsed")}
              </Button>
              <Button type="submit" className="gap-1.5" disabled={saving}>
                {saving ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-3.5" />}
                {tCommon("actions.save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  )
}