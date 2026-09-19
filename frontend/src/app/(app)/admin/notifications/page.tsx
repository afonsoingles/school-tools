import type { Metadata } from "next"
import { NotificationsManager } from "@/components/admin/notifications-manager"

export const metadata: Metadata = {
  title: "Notifications/Admin",
}

export default function AdminNotificationsPage() {
  return <NotificationsManager />
}