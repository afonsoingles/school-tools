export type EvalTranslator = {
  has: (key: string) => boolean
  (key: string): string
}

export function evaluationTypeLabel(t: EvalTranslator, type: string): string {
  const key = `type.${type}`
  return t.has(key) ? t(key) : type
}

const EVALUATION_TYPE_BADGE_CLASS: Record<string, string> = {
  exam: "bg-red-500/15 text-red-400",
  quiz: "bg-amber-500/15 text-amber-400",
}

export function evaluationTypeBadgeClass(type: string): string {
  return EVALUATION_TYPE_BADGE_CLASS[type] ?? "bg-muted text-muted-foreground"
}