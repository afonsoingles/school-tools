"use client"

import { useEffect, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { CheckCheck, Loader2, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { LoadingState } from "@/components/ui/loading"
import { NotificationTypeIcon } from "@/components/notifications/notification-type-icon"
import { cn } from "@/lib/utils"
import {
  deleteNotification,
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/api/notifications"
import { errorMessage } from "@/lib/errors"
import type { Notification } from "@/types"

function formatDateTime(iso: string, locale: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ""
  return date.toLocaleString(locale, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function NotificationsList() {
  const t = useTranslations("notifications")
  const locale = useLocale()
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [markingAll, setMarkingAll] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    getNotifications(100)
      .then(setNotifications)
      .catch((err) => setLoadError(errorMessage(err)))
      .finally(() => setLoading(false))
  }, [])

  function handleOpen(notification: Notification) {
    if (!notification.read) {
      setNotifications((prev) => prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n)))
      markNotificationRead(notification.id).catch(() => {})
    }
    if (notification.deep_link) {
      router.push(notification.deep_link)
    }
  }

  async function handleMarkAll() {
    setMarkingAll(true)
    try {
      await markAllNotificationsRead()
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    } catch {
      // ignore
    } finally {
      setMarkingAll(false)
    }
  }

  async function handleDelete(notification: Notification) {
    setNotifications((prev) => prev.filter((n) => n.id !== notification.id))
    try {
      await deleteNotification(notification.id)
      toast.success(t("list.deleted"))
    } catch (err) {
      setNotifications((prev) => [notification, ...prev])
      toast.error(errorMessage(err))
    }
  }

  const unreadCount = notifications.filter((n) => !n.read).length

  if (loading) {
    return <LoadingState />
  }

  if (loadError) {
    return <p className="text-sm text-destructive">{loadError}</p>
  }

  if (notifications.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          {t("list.empty")}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {unreadCount > 0 && (
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={handleMarkAll}
            disabled={markingAll}
          >
            {markingAll ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCheck className="size-3.5" />}
            {t("list.markAllRead")}
          </Button>
        </div>
      )}

      <div className="flex flex-col overflow-hidden border divide-y rounded-lg divide-border border-border bg-background">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={cn(
              "group flex items-start gap-1 px-4 py-3 transition-colors hover:bg-foreground/5",
              !notification.read && "bg-primary/5"
            )}
          >
            <button
              type="button"
              onClick={() => handleOpen(notification)}
              className="flex min-w-0 flex-1 items-start gap-3 text-left"
            >
              <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-muted">
                <NotificationTypeIcon type={notification.type} className="size-4 text-muted-foreground" />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium">{notification.title}</span>
                  {!notification.read && <span className="size-1.5 shrink-0 rounded-full bg-primary" />}
                </span>
                <span className="text-sm text-muted-foreground">{notification.body}</span>
                <span className="text-xs text-muted-foreground/70">{formatDateTime(notification.created_at, locale)}</span>
              </span>
            </button>
            <Button
              variant="ghost"
              size="icon-sm"
              className="mt-0.5 shrink-0 hover:bg-foreground/10! md:opacity-0 md:group-hover:opacity-100"
              onClick={() => handleDelete(notification)}
              aria-label={t("list.delete")}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}