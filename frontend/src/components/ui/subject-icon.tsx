import { DEFAULT_SUBJECT_ICON, LEGACY_ICON_ALIASES, SUBJECT_ICONS } from "@/lib/icons"

export function SubjectIcon({
  icon,
  className,
}: {
  icon: string
  className?: string
}) {
  const Icon = SUBJECT_ICONS[LEGACY_ICON_ALIASES[icon] ?? icon] ?? SUBJECT_ICONS[DEFAULT_SUBJECT_ICON]
  return <Icon className={className} />
}