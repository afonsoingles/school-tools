"use client"

import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { useLocale, useTranslations } from "next-intl"
import { Bell, Loader2, Smartphone, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { errorMessage } from "@/lib/errors"
import { formatDateDmy } from "@/lib/date-time"
import {
  ensurePushSubscription,
  getCurrentPushEndpoint,
  isPushSupported,
  isPwaStandalone,
  PushInvalidKeyError,
  PushServerError,
  PushUnsupportedError,
  pushEndpointHost,
  removePushSubscription,
} from "@/lib/push"
import {
  getNotificationSettings,
  getPushSubscriptions,
  setPushSubscriptionEnabled,
  unsubscribeFromPush,
  updateNotificationSettings,
  type PushDevice,
} from "@/lib/api/notifications"

export function NotificationSettingsSection() {
  const t = useTranslations("settings.notifications")
  const locale = useLocale()
  const [enabled, setEnabled] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [devices, setDevices] = useState<PushDevice[]>([])
  const [devicesLoading, setDevicesLoading] = useState(true)
  const [currentEndpoint, setCurrentEndpoint] = useState<string | null>(null)
  const [pendingEndpoints, setPendingEndpoints] = useState<Set<string>>(new Set())

  const refreshDevices = useCallback(() => {
    Promise.all([getPushSubscriptions(), getCurrentPushEndpoint()])
      .then(([subs, endpoint]) => {
        setDevices(subs)
        setCurrentEndpoint(endpoint)
      })
      .catch(() => {})
      .finally(() => setDevicesLoading(false))
  }, [])

  useEffect(() => {
    getNotificationSettings()
      .then(setEnabled)
      .catch((err) => toast.error(errorMessage(err)))
      .finally(() => setLoading(false))
    refreshDevices()
  }, [refreshDevices])

  async function handleChange(next: boolean) {
    setSaving(true)
    setEnabled(next)
    try {
      const confirmed = await updateNotificationSettings(next)
      setEnabled(confirmed)
      if (confirmed && next) {
        if (isPushSupported() && isPwaStandalone()) {
          let endpoint: string | false = false
          try {
            endpoint = await ensurePushSubscription()
          } catch (err) {
            console.error("Push subscription failed:", err)
            if (err instanceof PushServerError) {
              toast.error(t("pushServerError"))
            } else if (err instanceof PushInvalidKeyError) {
              toast.error(t("pushInvalidKey"))
            } else if (err instanceof PushUnsupportedError) {
              toast.warning(t("pushUnsupported"))
            } else {
              toast.warning(t("pushError"))
            }
          }
          if (endpoint) {
            await setPushSubscriptionEnabled(endpoint, true).catch(() => {})
            toast.success(t("enabled"))
          } else {
            toast.info(t("pushInfo"))
          }
        } else if (isPushSupported()) {
          toast.info(t("pushPwaOnly"))
        } else {
          toast.success(t("enabled"))
        }
      } else if (!next) {
        const endpoint = await getCurrentPushEndpoint()
        if (endpoint) {
          await setPushSubscriptionEnabled(endpoint, false).catch(() => {})
        }
        toast.success(t("disabled"))
      }
    } catch (err) {
      setEnabled(!next)
      toast.error(errorMessage(err))
    } finally {
      setSaving(false)
      refreshDevices()
    }
  }

  async function toggleDevice(device: PushDevice, next: boolean) {
    setPendingEndpoints((prev) => new Set(prev).add(device.endpoint))
    try {
      await setPushSubscriptionEnabled(device.endpoint, next)
      setDevices((prev) =>
        prev.map((item) => (item.endpoint === device.endpoint ? { ...item, enabled: next } : item))
      )
      toast.success(t("deviceUpdated"))
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setPendingEndpoints((prev) => {
        const nextSet = new Set(prev)
        nextSet.delete(device.endpoint)
        return nextSet
      })
    }
  }

  async function removeDevice(device: PushDevice) {
    setPendingEndpoints((prev) => new Set(prev).add(device.endpoint))
    try {
      if (device.endpoint === currentEndpoint) {
        await removePushSubscription()
      } else {
        await unsubscribeFromPush(device.endpoint)
      }
      toast.success(t("deviceRemoved"))
      refreshDevices()
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setPendingEndpoints((prev) => {
        const nextSet = new Set(prev)
        nextSet.delete(device.endpoint)
        return nextSet
      })
    }
  }

  function deviceName(device: PushDevice): string {
    if (device.device_label) return device.device_label
    return pushEndpointHost(device.endpoint, device.endpoint)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h3 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
          <Bell className="size-5 text-muted-foreground" />
          {t("title")}
        </h3>
        <p className="text-sm text-muted-foreground">
          {t("description")}
        </p>
      </div>

      <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-background p-4">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-medium">{t("enableLabel")}</span>
          <span className="text-xs text-muted-foreground">
            {t("enableDescription")}
          </span>
        </div>
        {loading || saving ? (
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
        ) : (
          <Switch checked={enabled} onCheckedChange={handleChange} aria-label={t("ariaLabel")} />
        )}
      </div>

      <div className="flex flex-col gap-1">
        <h4 className="flex items-center gap-1.5 text-sm font-semibold">
          <Smartphone className="size-3.5 text-muted-foreground" />
          {t("pushDevices")}
        </h4>
        <p className="text-sm text-muted-foreground">
          {t("pushDevicesDescription")}
        </p>
      </div>

      {devicesLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
        </div>
      ) : devices.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("devicesEmpty")}</p>
      ) : (
        <div className="flex flex-col divide-y divide-border rounded-lg border border-border bg-background">
          {devices.map((device) => {
            const pending = pendingEndpoints.has(device.endpoint)
            const isCurrent = device.endpoint === currentEndpoint
            return (
              <div key={device.endpoint} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="flex items-center gap-1.5 text-sm font-medium">
                    <Smartphone className="size-3.5 shrink-0 text-muted-foreground" />
                    <span className="truncate">{deviceName(device)}</span>
                    {isCurrent && (
                      <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
                        {t("deviceThisDevice")}
                      </span>
                    )}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {t("deviceSince", {
                      date: formatDateDmy(device.created_at, locale),
                    })}
                  </span>
                </div>
                <span className="flex items-center gap-1.5">
                  {pending ? (
                    <Loader2 className="size-4 animate-spin text-muted-foreground" />
                  ) : (
                    <Switch
                      checked={device.enabled}
                      onCheckedChange={(next) => toggleDevice(device, next)}
                      aria-label={t("deviceToggleAria", { name: deviceName(device) })}
                    />
                  )}
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => removeDevice(device)}
                    disabled={pending}
                    aria-label={t("deviceRemoveAria", { name: deviceName(device) })}
                    className="hover:bg-foreground/10! hover:text-destructive"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}