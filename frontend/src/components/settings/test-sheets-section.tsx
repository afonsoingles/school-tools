"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { useTranslations } from "next-intl"
import { AlignJustify, AlertTriangle, ArrowRight, Grid3x3, Loader2, Minus, NotebookPen, Plus } from "lucide-react"

import { Badge } from "@/components/ui/badge"
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
import { Skeleton } from "@/components/ui/skeleton"
import { errorMessage } from "@/lib/errors"
import { getTestSheets, updateTestSheetStock, type TestSheetState } from "@/lib/api/test-sheets"
import { TestSheetStockBoxes } from "@/components/test-sheets/stock-boxes"

type StockAction = "add" | "remove"

export function TestSheetsSection() {
  const t = useTranslations("settings.testSheets")
  const tCommon = useTranslations("common.actions")
  const [state, setState] = useState<TestSheetState | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [open, setOpen] = useState(false)
  const [action, setAction] = useState<StockAction>("add")
  const [lined, setLined] = useState("1")
  const [graph, setGraph] = useState("1")

  useEffect(() => {
    getTestSheets()
      .then(setState)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  function openTopUp() {
    setAction("add")
    setLined("1")
    setGraph("1")
    setOpen(true)
  }

  function maxFor(value: number, current: number) {
    return action === "remove" ? Math.min(current, value) : value
  }

  function stepValue(type: "lined" | "graph", delta: number) {
    const current = state?.stock?.[type] ?? 0
    const cap = action === "remove" ? current : 1000
    const setter = type === "lined" ? setLined : setGraph
    setter((prev) => String(Math.min(cap, Math.max(0, Number(prev) + delta))))
  }

  function setValue(type: "lined" | "graph", raw: string) {
    const current = state?.stock?.[type] ?? 0
    const cap = action === "remove" ? current : 1000
    const numeric = Number(raw)
    const clamped = Number.isFinite(numeric) ? Math.min(cap, Math.max(0, numeric)) : 0
    const setter = type === "lined" ? setLined : setGraph
    setter(String(clamped))
  }

  async function handleTopUp(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    try {
      const next = await updateTestSheetStock(Number(lined) || 0, Number(graph) || 0, action)
      setState(next)
      setOpen(false)
      toast.success(t("stockUpdated"))
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-9 w-56 rounded-lg" />
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="h-24 w-full rounded-lg" />
        <Skeleton className="h-10 w-36 rounded-lg" />
      </div>
    )
  }

  if (!state?.enabled) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h3 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
            <NotebookPen className="size-5 text-muted-foreground" />
            {t("title")}
          </h3>
          <p className="text-sm text-muted-foreground">
            {t("description")}
          </p>
        </div>
        <p className="text-sm text-muted-foreground">{t("notGranted")}</p>
      </div>
    )
  }

  const total = state.stock.lined + state.stock.graph

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h3 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
          <NotebookPen className="size-5 text-muted-foreground" />
          {t("title")}
        </h3>
        <p className="text-sm text-muted-foreground">
          {t("description")}
        </p>
      </div>

      <TestSheetStockBoxes
        lined={state.stock.lined}
        graph={state.stock.graph}
        linedLabel={t("lined")}
        graphLabel={t("graph")}
      />

      {state.low && (
        <Badge variant="destructive" className="w-fit gap-1.5">
          <AlertTriangle className="size-3.5" />
          {t("lowStock", { count: total })}
        </Badge>
      )}

      {state.pending.length > 0 && (
        <Link
          href="/evaluations"
          className="flex items-center justify-between gap-3 rounded-lg border border-amber-500/40 bg-amber-500/5 px-4 py-3 text-sm transition-colors hover:bg-amber-500/10"
        >
          <span className="flex items-center gap-2">
            <NotebookPen className="size-4 text-amber-500" />
            <span className="font-medium">{t("toReconcile", { count: state.pending.length })}</span>
          </span>
          <ArrowRight className="size-4 text-amber-500" />
        </Link>
      )}

      <div>
        <Button
          type="button"
          variant="outline"
          className="gap-1.5"
          onClick={openTopUp}
        >
          <Plus className="size-4" />
          {t("updateStock")}
        </Button>
      </div>

      <Dialog open={open} onOpenChange={(next) => !next && !saving && setOpen(false)}>
        <DialogContent>
          <form className="flex flex-col gap-4" onSubmit={handleTopUp}>
            <DialogHeader>
              <DialogTitle>{t("updateStock")}</DialogTitle>
              <DialogDescription>
                {t("topUpDescription")}
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1" role="radiogroup" aria-label={t("updateStock")}>
              <Button
                type="button"
                size="sm"
                variant={action === "add" ? "default" : "ghost"}
                className="gap-1.5"
                onClick={() => setAction("add")}
              >
                <Plus className="size-3.5" />
                {t("add")}
              </Button>
              <Button
                type="button"
                size="sm"
                variant={action === "remove" ? "destructive" : "ghost"}
                className="gap-1.5"
                onClick={() => setAction("remove")}
              >
                <Minus className="size-3.5" />
                {t("remove")}
              </Button>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2.5">
                <span className="flex flex-col gap-0.5">
                  <span className="flex items-center gap-1.5 text-sm font-medium">
                    <AlignJustify className="size-3.5 text-muted-foreground" />
                    {t("lined")}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {t("current", { value: state.stock.lined })}
                  </span>
                </span>
                <span className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="hover:bg-foreground/10!"
                    aria-label={t("decrementAria", { type: t("lined") })}
                    disabled={saving || Number(lined) <= 0}
                    onClick={() => stepValue("lined", -1)}
                  >
                    <Minus className="size-3.5" />
                  </Button>
                  <Input
                    id="stock-lined"
                    type="number"
                    min={0}
                    max={maxFor(1000, state.stock.lined)}
                    value={lined}
                    onChange={(e) => setValue("lined", e.target.value)}
                    className="w-14 text-center"
                    aria-label={t("lined")}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="hover:bg-foreground/10!"
                    aria-label={t("incrementAria", { type: t("lined") })}
                    disabled={saving || Number(lined) >= maxFor(1000, state.stock.lined)}
                    onClick={() => stepValue("lined", 1)}
                  >
                    <Plus className="size-3.5" />
                  </Button>
                </span>
              </div>

              <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2.5">
                <span className="flex flex-col gap-0.5">
                  <span className="flex items-center gap-1.5 text-sm font-medium">
                    <Grid3x3 className="size-3.5 text-muted-foreground" />
                    {t("graph")}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {t("current", { value: state.stock.graph })}
                  </span>
                </span>
                <span className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="hover:bg-foreground/10!"
                    aria-label={t("decrementAria", { type: t("graph") })}
                    disabled={saving || Number(graph) <= 0}
                    onClick={() => stepValue("graph", -1)}
                  >
                    <Minus className="size-3.5" />
                  </Button>
                  <Input
                    id="stock-graph"
                    type="number"
                    min={0}
                    max={maxFor(1000, state.stock.graph)}
                    value={graph}
                    onChange={(e) => setValue("graph", e.target.value)}
                    className="w-14 text-center"
                    aria-label={t("graph")}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="hover:bg-foreground/10!"
                    aria-label={t("incrementAria", { type: t("graph") })}
                    disabled={saving || Number(graph) >= maxFor(1000, state.stock.graph)}
                    onClick={() => stepValue("graph", 1)}
                  >
                    <Plus className="size-3.5" />
                  </Button>
                </span>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={saving}>
                {tCommon("cancel")}
              </Button>
              <Button type="submit" className="gap-1.5" disabled={saving || (Number(lined) === 0 && Number(graph) === 0)}>
                {saving ? <Loader2 className="size-4 animate-spin" /> : action === "add" ? <Plus className="size-4" /> : <Minus className="size-4" />}
                {action === "add" ? t("add") : t("remove")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}