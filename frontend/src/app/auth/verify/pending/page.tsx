"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, LogOut, Mail } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { resendVerificationEmailClient } from "@/lib/api/auth-client"

const RESEND_COOLDOWN_SECONDS = 21600

export default function VerifyEmailPendingPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [cooldown, setCooldown] = useState(0)

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
      toast.error(err instanceof Error ? err.message : "Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center w-full max-w-sm gap-3 text-center">
      <h1 className="text-4xl font-bold tracking-tight text-center text-foreground">
        Check your email
      </h1>
      <p className="text-base text-muted-foreground">
        We sent you an email with a link to verify your email address. Please check your inbox and
        click the link to continue.
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
          {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend email"}
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
          Logout
        </Button>
      </div>
    </div>
  )
}