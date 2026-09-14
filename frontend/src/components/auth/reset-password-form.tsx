"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

import { AuthCard, AuthField, AuthSubmit } from "@/components/auth/auth-form"
import { errorMessage } from "@/lib/errors"
import { confirmPasswordReset, isValidPasswordResetToken } from "@/lib/api/auth-client"
import { PASSWORD_HINT, PASSWORD_REGEX } from "@/lib/user-rules"

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter()
  const [status, setStatus] = useState<"validating" | "invalid" | "ready">(
    token ? "validating" : "invalid"
  )
  const [invalidMessage, setInvalidMessage] = useState<string | null>(null)
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!token) return
    let cancelled = false

    isValidPasswordResetToken(token)
      .then((valid) => {
        if (!cancelled) setStatus(valid ? "ready" : "invalid")
      })
      .catch((err) => {
        if (!cancelled) {
          setInvalidMessage(errorMessage(err))
          setStatus("invalid")
        }
      })

    return () => {
      cancelled = true
    }
  }, [token])

  if (status === "validating") {
    return (
      <div className="flex items-center justify-center w-full max-w-sm py-12">
        <Loader2 className="animate-spin text-muted-foreground size-8" />
      </div>
    )
  }

  if (status === "invalid") {
    return (
      <AuthCard title="Invalid reset link" description={invalidMessage ?? undefined}>
        <div className="flex justify-center">
          <Link
            href="/auth/login"
            className="text-sm font-semibold text-foreground underline underline-offset-4"
          >
            Back to login
          </Link>
        </div>
      </AuthCard>
    )
  }

  return (
    <AuthCard
      title="Set a new password"
      description="Choose a new password for your account."
      onSubmit={async (event) => {
        event.preventDefault()

        if (!PASSWORD_REGEX.test(password)) {
          toast.error(PASSWORD_HINT)
          return
        }
        if (password !== confirm) {
          toast.error("Passwords do not match.")
          return
        }

        setIsSubmitting(true)
        try {
          await confirmPasswordReset(token, password)
          toast.success("Your password has been reset successfully! Login with your new password.")
          router.push("/auth/login")
          router.refresh()
        } catch (err) {
          toast.error(errorMessage(err))
        } finally {
          setIsSubmitting(false)
        }
      }}
    >
      <AuthField
        id="password"
        label="New password"
        type="password"
        placeholder="New password"
        autoComplete="new-password"
        required
        value={password}
        onChange={(event) => setPassword(event.target.value)}
      />

      <AuthField
        id="confirm-password"
        label="Confirm password"
        type="password"
        placeholder="Confirm password"
        autoComplete="new-password"
        required
        value={confirm}
        onChange={(event) => setConfirm(event.target.value)}
      />

      <AuthSubmit loading={isSubmitting}>Reset password</AuthSubmit>
    </AuthCard>
  )
}