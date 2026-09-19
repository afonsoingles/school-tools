"use client"

import { useEffect, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { toast } from "sonner"
import { CalendarDays, Loader2, NotebookPen } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { errorMessage } from "@/lib/errors"
import { formatDateDmy } from "@/lib/date-time"
import { getUserTestSheets, setUserTestSheets } from "@/lib/api/admin"
import { TestSheetStockBoxes } from "@/components/test-sheets/stock-boxes"

export function TestSheetsGrant({ userId }: { userId: string }) {
  const t = useTranslations("admin.user.testSheets")
  const locale = useLocale()
  const [enabled, setEnabled] = useState(false)
  const [stock, setStock] = useState<{ lined: number; graph: number }>({ lined: 0, graph: 0 })
  const [grantedAt, setGrantedAt] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getUserTestSheets(userId)
      .then((res) => {
        setEnabled(res.enabled)
        setStock(res.stock)
        setGrantedAt(res.granted_at)
      })
      .catch((err) => toast.error(errorMessage(err)))
      .finally(() => setLoading(false))
  }, [userId])

  async function handleChange(next: boolean) {
    setSaving(true)
    setEnabled(next)
    try {
      const res = await setUserTestSheets(userId, next)
      setEnabled(res.enabled)
      setStock(res.stock)
      setGrantedAt(res.granted_at)
      toast.success(next ? t("enabledToast") : t("disabledToast"))
    } catch (err) {
      setEnabled(!next)
      toast.error(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <NotebookPen className="size-4 text-muted-foreground" />
          Test sheets
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium">{t("tracking")}</span>
            <span className="text-xs text-muted-foreground">
              {t("description")}
            </span>
          </div>
          {loading || saving ? (
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          ) : (
            <Switch
              checked={enabled}
              onCheckedChange={handleChange}
              aria-label={t("enableAria")}
            />
          )}
        </div>

        {enabled && (
          <div className="flex flex-col gap-3">
            <TestSheetStockBoxes
              lined={stock.lined}
              graph={stock.graph}
              linedLabel={t("lined")}
              graphLabel={t("graph")}
            />
            {grantedAt && (
              <Badge variant="outline" className="w-fit gap-1.5">
                <CalendarDays className="size-3.5" />
                {t("since", { date: formatDateDmy(grantedAt, locale) })}
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}