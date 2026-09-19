"use client"

import { useEffect, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Bell, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { NotificationTypeIcon } from "@/components/notifications/notification-type-icon"
import { cn } from "@/lib/utils"
import {
  getNotifications,
  getUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/api/notifications"
import type { Notification } from "@/types"

function relativeTime(
  iso: string,
  locale: string,
  labels: {
    justNow: string
    minutesAgo: (count: number) => string
    hoursAgo: (count: number) => string
    daysAgo: (count: number) => string
  }
): string {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ""
  const diff = Date.now() - then
  const minute = 60000
  const hour = 3600000
  const day = 86400000

  if (diff < minute) return labels.justNow
  if (diff < hour) return labels.minutesAgo(Math.floor(diff / minute))
  if (diff < day) return labels.hoursAgo(Math.floor(diff / hour))
  if (diff < 7 * day) return labels.daysAgo(Math.floor(diff / day))
  return new Date(iso).toLocaleDateString(locale, { day: "numeric", month: "short" })
}

interface NotificationBellProps {
  side?: "top" | "bottom"
  align?: "start" | "end"
  className?: string
  iconClassName?: string
}

export function NotificationBell({ side = "bottom", align = "end", className, iconClassName }: NotificationBellProps) {
  const t = useTranslations("notifications")
  const locale = useLocale()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [count, setCount] = useState(0)
  const [items, setItems] = useState<Notification[]>([])
  const [loaded, setLoaded] = useState(false)

  async function refreshCount() {
    try {
      setCount(await getUnreadCount())
    } catch {
      // ignore
    }
  }

  async function loadRecent() {
    try {
      setItems(await getNotifications(8))
    } catch {
      // ignore
    } finally {
      setLoaded(true)
    }
  }

  useEffect(() => {
    let active = true
    const refresh = () => {
      getUnreadCount()
        .then((next) => {
          if (active) setCount(next)
        })
        .catch(() => {})
    }
    refresh()
    const id = setInterval(refresh, 60000)
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh()
    }
    document.addEventListener("visibilitychange", onVisible)
    return () => {
      active = false
      clearInterval(id)
      document.removeEventListener("visibilitychange", onVisible)
    }
  }, [])

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (next) {
      setLoaded(false)
      loadRecent()
      refreshCount()
    }
  }

  function handleItemClick(notification: Notification) {
    setOpen(false)
    if (!notification.read) {
      setItems((prev) => prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n)))
      setCount((c) => Math.max(0, c - 1))
      markNotificationRead(notification.id).catch(() => {})
    }
    router.push(notification.deep_link || "/notifications")
  }

  async function handleMarkAll() {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })))
    setCount(0)
    try {
      await markAllNotificationsRead()
    } catch {
      // ignore
    }
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            className={cn(
              "relative text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground aria-expanded:bg-sidebar-accent aria-expanded:text-sidebar-foreground",
              className
            )}
            aria-label={count > 0 ? t("bell.ariaUnread", { count }) : t("bell.aria")}
          >
            <Bell className={cn("size-4", iconClassName)} />
            {count > 0 && (
              <span className="absolute -top-1 -right-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-primary px-[3px] text-[9px] font-semibold leading-none text-primary-foreground">
                {count > 99 ? "99+" : count}
              </span>
            )}
          </Button>
        }
      />
      <PopoverContent
        side={side}
        align={align}
        className="w-80 max-w-[calc(100vw-1.5rem)] p-0 sm:w-96"
      >
        <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2.5">
          <span className="flex items-center gap-2 text-sm font-semibold">
            {t("bell.header")}
            {count > 0 && (
              <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[11px] font-medium text-primary">
                {count}
              </span>
            )}
          </span>
          {count > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto px-1.5 py-0.5 text-xs text-muted-foreground hover:bg-foreground/5! hover:text-foreground"
              onClick={handleMarkAll}
            >
              {t("bell.markAllRead")}
            </Button>
          )}
        </div>

        <div className="max-h-80 overflow-y-auto">
          {!loaded ? (
            <div className="flex justify-center py-10">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : items.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">{t("bell.empty")}</p>
          ) : (
            <div className="flex flex-col divide-y divide-border">
              {items.map((notification) => (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => handleItemClick(notification)}
                  className={cn(
                    "group flex min-w-0 items-start gap-3 px-3 py-2.5 text-left transition-colors",
                    !notification.read ? "bg-primary/5 hover:bg-primary/10" : "hover:bg-foreground/5"
                  )}
                >
                  <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
                    <NotificationTypeIcon type={notification.type} className="size-4 text-muted-foreground" />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate text-sm font-medium">{notification.title}</span>
                      {!notification.read && <span className="size-1.5 shrink-0 rounded-full bg-primary" />}
                    </span>
                    <span className="line-clamp-2 text-xs text-muted-foreground">{notification.body}</span>
                    <span className="text-[11px] text-muted-foreground/70">
                      {relativeTime(notification.created_at, locale, {
                        justNow: t("time.justNow"),
                        minutesAgo: (count) => t("time.minutesAgo", { count }),
                        hoursAgo: (count) => t("time.hoursAgo", { count }),
                        daysAgo: (count) => t("time.daysAgo", { count }),
                      })}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="border-t border-border p-1.5">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-center text-sm hover:bg-foreground/5!"
            render={<Link href="/notifications" />}
            nativeButton={false}
            onClick={() => setOpen(false)}
          >
            {t("bell.viewAll")}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}