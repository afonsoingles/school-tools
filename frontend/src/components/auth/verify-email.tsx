"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"

export function VerifyEmailContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token")
  const [status, setStatus] = useState<"verifying" | "success" | "needs-login" | "error">(
    token ? "verifying" : "error"
  )

  useEffect(() => {
    if (!token) return

    let cancelled = false
    let redirectTimeout: ReturnType<typeof setTimeout> | undefined

    fetch(`/api/v1/auth/verify?token=${encodeURIComponent(token)}`, { method: "POST" })
      .then(async (res) => {
        if (cancelled) return
        if (res.status === 401) {
          setStatus("needs-login")
          return
        }
        if (!res.ok) throw new Error()

        setStatus("success")
        redirectTimeout = setTimeout(() => {
          router.push("/dashboard")
          router.refresh()
        }, 1500)
      })
      .catch(() => {
        if (!cancelled) setStatus("error")
      })

    return () => {
      cancelled = true
      if (redirectTimeout) clearTimeout(redirectTimeout)
    }
  }, [token, router])

  const loginWithNext = `/auth/login?next=${encodeURIComponent(`/auth/verify?token=${token ?? ""}`)}`

  return (
    <div className="flex flex-col items-center w-full max-w-sm gap-4 text-center">
      {status === "verifying" && (
        <Loader2 className="animate-spin text-muted-foreground size-8" />
      )}

      {status === "success" && (
        <>
          <h1 className="text-2xl font-bold tracking-tight">Verification succeeded!</h1>
          <p className="text-base text-muted-foreground">Redirecting...</p>
        </>
      )}

      {status === "needs-login" && (
        <>
          <h1 className="text-2xl font-bold tracking-tight">Login first</h1>
          <p className="text-base text-muted-foreground">
            You need to login first before verifying your email.
          </p>
          <Button
            render={<Link href={loginWithNext} />}
            nativeButton={false}
            size="lg"
            className="h-12 text-base"
          >
            Login
          </Button>
        </>
      )}

      {status === "error" && (
        <>
          <h1 className="text-2xl font-bold tracking-tight">Invalid or expired link</h1>
          <Button
            render={<Link href="/auth/login" />}
            nativeButton={false}
            size="lg"
            className="h-12 text-base"
          >
            Back to login
          </Button>
        </>
      )}
    </div>
  )
}
