import { getRequestConfig } from "next-intl/server"
import { cookies, headers } from "next/headers"

import { getCurrentUser } from "@/lib/api/auth"
import { getSessionToken } from "@/lib/auth/session"
import { defaultLocale, fromAcceptLanguage, isLocale, type Locale } from "./config"
import enMessages from "../../messages/en"
import ptMessages from "../../messages/pt"

const NEXT_LOCALE_COOKIE = "NEXT_LOCALE"

async function resolveLocale(): Promise<Locale> {
  const token = await getSessionToken()
  if (token) {
    try {
      const user = await getCurrentUser()
      if (isLocale(user.locale)) return user.locale
    } catch {
      // fall through to request-based detection
    }
  }

  const headerStore = await headers()
  const negotiated = fromAcceptLanguage(headerStore.get("accept-language"))
  if (negotiated) return negotiated

  const cookieStore = await cookies()
  const cookieLocale = cookieStore.get(NEXT_LOCALE_COOKIE)?.value
  if (isLocale(cookieLocale)) return cookieLocale

  return defaultLocale
}

export default getRequestConfig(async () => {
  const locale = await resolveLocale()
  const messages = locale === "pt" ? ptMessages : enMessages

  return {
    locale,
    messages,
  }
})
