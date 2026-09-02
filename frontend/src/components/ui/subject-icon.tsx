import { DEFAULT_SUBJECT_ICON, SUBJECT_ICONS } from "@/lib/icons"

export function SubjectIcon({
  icon,
  className,
}: {
  icon: string
  className?: string
}) {
  const Icon = SUBJECT_ICONS[icon] ?? SUBJECT_ICONS[DEFAULT_SUBJECT_ICON]
  return <Icon className={className} />
}