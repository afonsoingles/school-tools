"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { Loader2, LogOut, Mail } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  getCurrentUserClient,
  resendVerificationEmailClient,
} from "@/lib/api/auth-client"

const RESEND_COOLDOWN_SECONDS = 21600
const CHECK_INTERVAL_MS = 5000

export default function VerifyEmailPendingPage() {
  const router = useRouter()
  const t = useTranslations("auth")
  const tCommon = useTranslations("common")
  const [loading, setLoading] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [cooldown, setCooldown] = useState(0)

  const checkVerified = useCallback(async (): Promise<boolean> => {
    let user
    try {
      user = await getCurrentUserClient()
    } catch {
      return false
    }

    if (!user) {
      router.push("/auth/login")
      return true
    }

    if (user.email_verified) {
      router.push("/dashboard")
      router.refresh()
      return true
    }

    return false
  }, [router])

  useEffect(() => {
    let active = true
    const interval = setInterval(async () => {
      if (!active) return
      if (await checkVerified()) clearInterval(interval)
    }, CHECK_INTERVAL_MS)

    const onFocus = () => {
      if (active) checkVerified()
    }

    checkVerified()

    window.addEventListener("focus", onFocus)
    document.addEventListener("visibilitychange", onFocus)

    return () => {
      active = false
      clearInterval(interval)
      window.removeEventListener("focus", onFocus)
      document.removeEventListener("visibilitychange", onFocus)
    }
  }, [checkVerified])

  async function handleLogout() {
    setLoggingOut(true)
    try {
      await fetch("/api/v1/auth/logout", { method: "POST" })
    } finally {
      router.push("/auth/login")
      router.refresh()
    }
  }

  async function handleResend() {
    setLoading(true)

    try {
      const text = await resendVerificationEmailClient()
      toast.success(text)
      setCooldown(RESEND_COOLDOWN_SECONDS)
      const timer = setInterval(() => {
        setCooldown((seconds) => {
          if (seconds <= 1) {
            clearInterval(timer)
            return 0
          }
          return seconds - 1
        })
      }, 1000)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : tCommon("state.error"))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center w-full max-w-sm gap-3 text-center">
      <h1 className="text-4xl font-bold tracking-tight text-center text-foreground">
        {t("verifyPending.title")}
      </h1>
      <p className="text-base text-muted-foreground">
        {t("verifyPending.body")}
      </p>

      <div className="mt-2 flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={handleResend}
          disabled={loading || cooldown > 0}
          className="gap-1.5 w-full sm:w-auto"
        >
          {loading ? <Loader2 className="size-4 animate-spin" /> : <Mail className="size-4" />}
          {cooldown > 0 ? t("verifyPending.resendIn", { seconds: cooldown }) : t("verifyPending.resend")}
        </Button>

        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={handleLogout}
          disabled={loggingOut}
          className="gap-1.5 w-full sm:w-auto"
        >
          {loggingOut ? <Loader2 className="size-4 animate-spin" /> : <LogOut className="size-4" />}
          {tCommon("actions.logout")}
        </Button>
      </div>
    </div>
  )
}