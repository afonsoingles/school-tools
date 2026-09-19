import { apiFetch } from "@/lib/api/client"
import type { Notification } from "@/types"

interface NotificationsResponse {
  success: boolean
  notifications: Notification[]
}

interface UnreadCountResponse {
  success: boolean
  count: number
}

interface SettingsResponse {
  success: boolean
  enabled: boolean
}

export async function getNotifications(limit = 50): Promise<Notification[]> {
  const res = await apiFetch<NotificationsResponse>("/v1/notifications", {
    params: { limit },
  })
  return res.notifications
}

export async function getUnreadCount(): Promise<number> {
  const res = await apiFetch<UnreadCountResponse>("/v1/notifications/unread-count")
  return res.count
}

export async function markNotificationRead(id: string): Promise<Notification> {
  const res = await apiFetch<{ success: boolean; notification: Notification }>(
    `/v1/notifications/${id}/read`,
    { method: "PATCH" }
  )
  return res.notification
}

export async function markAllNotificationsRead(): Promise<void> {
  await apiFetch<{ success: boolean }>("/v1/notifications/read-all", { method: "POST" })
}

export async function deleteNotification(id: string): Promise<void> {
  await apiFetch<{ success: boolean }>(`/v1/notifications/${id}`, { method: "DELETE" })
}

export async function getNotificationSettings(): Promise<boolean> {
  const res = await apiFetch<SettingsResponse>("/v1/notifications/settings")
  return res.enabled
}

export async function updateNotificationSettings(enabled: boolean): Promise<boolean> {
  const res = await apiFetch<SettingsResponse>("/v1/notifications/settings", {
    method: "PATCH",
    body: JSON.stringify({ enabled }),
  })
  return res.enabled
}

export async function getVapidPublicKey(): Promise<string> {
  const res = await apiFetch<{ success: boolean; public_key: string }>(
    "/v1/notifications/vapid-key"
  )
  return res.public_key
}

export interface PushDevice {
  endpoint: string
  enabled: boolean
  device_label: string | null
  created_at: string
}

export async function subscribeToPush(
  subscription: PushSubscription,
  deviceLabel?: string
): Promise<void> {
  await apiFetch<{ success: boolean }>("/v1/notifications/subscribe", {
    method: "POST",
    body: JSON.stringify({ ...subscription.toJSON(), device_label: deviceLabel }),
  })
}

export async function unsubscribeFromPush(endpoint: string): Promise<void> {
  await apiFetch<{ success: boolean }>("/v1/notifications/unsubscribe", {
    method: "POST",
    body: JSON.stringify({ endpoint }),
  })
}

export async function getPushSubscriptions(): Promise<PushDevice[]> {
  const res = await apiFetch<{ success: boolean; subscriptions: PushDevice[] }>(
    "/v1/notifications/subscriptions"
  )
  return res.subscriptions
}

export async function setPushSubscriptionEnabled(
  endpoint: string,
  enabled: boolean
): Promise<boolean> {
  const res = await apiFetch<{ success: boolean; found: boolean }>(
    "/v1/notifications/subscriptions",
    {
      method: "PATCH",
      body: JSON.stringify({ endpoint, enabled }),
    }
  )
  return res.found
}