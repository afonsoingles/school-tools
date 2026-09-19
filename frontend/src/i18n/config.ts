export const locales = ["en", "pt"] as const

export type Locale = (typeof locales)[number]

export const defaultLocale: Locale = "en"

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (locales as readonly string[]).includes(value)
}

function fromAcceptLanguage(header: string | null): Locale | null {
  if (!header) return null
  const tags = header
    .split(",")
    .map((part) => part.trim().split(";")[0]?.toLowerCase())
    .filter(Boolean)
  for (const tag of tags) {
    if (tag === "pt" || tag.startsWith("pt-")) return "pt"
    if (tag === "en" || tag.startsWith("en-")) return "en"
  }
  return null
}

export { fromAcceptLanguage }
