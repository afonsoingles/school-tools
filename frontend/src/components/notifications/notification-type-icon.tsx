import {
  Bell,
  CalendarOff,
  ClipboardList,
  GraduationCap,
  Megaphone,
  NotebookPen,
  PartyPopper,
  Trash2,
  type LucideIcon,
} from "lucide-react"

import type { NotificationType } from "@/types"

const TYPE_ICONS: Record<NotificationType, LucideIcon> = {
  evaluation: GraduationCap,
  homework: ClipboardList,
  holiday: PartyPopper,
  cancelled_class: CalendarOff,
  admin: Megaphone,
  test_sheet_stock: NotebookPen,
  test_sheet_reconcile: NotebookPen,
  deletion: Trash2,
}

export function NotificationTypeIcon({ type, className }: { type: NotificationType; className?: string }) {
  const Icon = TYPE_ICONS[type] ?? Bell
  return <Icon className={className} />
}