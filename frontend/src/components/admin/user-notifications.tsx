"use client"

import { useEffect, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { Bell, Loader2, Smartphone, ToggleLeft } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ErrorBox } from "@/components/ui/error-box"
import { errorMessage } from "@/lib/errors"
import { formatDateDmy } from "@/lib/date-time"
import { pushEndpointHost } from "@/lib/push"
import { getUserNotifications, type AdminUserNotifications } from "@/lib/api/admin"

export function UserNotificationsCard({ userId }: { userId: string }) {
  const t = useTranslations("admin.user.notifications")
  const locale = useLocale()
  const [data, setData] = useState<AdminUserNotifications | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    getUserNotifications(userId)
      .then((content) => {
        if (!cancelled) setData(content)
      })
      .catch((err) => {
        if (!cancelled) setError(errorMessage(err))
      })
    return () => {
      cancelled = true
    }
  }, [userId])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="size-4 text-muted-foreground" />
          {t("title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {error ? (
          <ErrorBox>{error}</ErrorBox>
        ) : data === null ? (
          <div className="flex items-center justify-center gap-2 py-5 text-sm text-muted-foreground" role="status">
            <Loader2 className="size-4 animate-spin" />
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-2 text-sm font-medium">
                <ToggleLeft className="size-4 text-muted-foreground" />
                {t("masterLabel")}
              </span>
              <Badge variant={data.enabled ? "secondary" : "outline"}>
                {data.enabled ? t("on") : t("off")}
              </Badge>
            </div>

            <div className="h-px bg-border" />

            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium text-muted-foreground">
                {t("devices", { count: data.devices.length })}
              </span>

              {data.devices.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("noDevices")}</p>
              ) : (
                <ul className="flex flex-col divide-y divide-border">
                  {data.devices.map((device, index) => (
                    <li key={device.endpoint + index} className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0">
                      <span className="flex min-w-0 flex-col">
                        <span className="flex items-center gap-1.5 truncate text-sm">
                          <Smartphone className="size-3.5 shrink-0 text-muted-foreground" />
                          <span className="truncate font-medium">
                            {device.device_label ?? pushEndpointHost(device.endpoint, "push")}
                          </span>
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {t("linked", { date: formatDateDmy(device.created_at, locale) })}
                        </span>
                      </span>
                      <Badge variant={device.enabled ? "secondary" : "outline"} className="shrink-0">
                        {device.enabled ? t("deviceEnabled") : t("deviceDisabled")}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}