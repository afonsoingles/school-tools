"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

import { AuthCard, AuthField, AuthSubmit } from "@/components/auth/auth-form"
import { errorMessage } from "@/lib/errors"
import { confirmPasswordReset, isValidPasswordResetToken } from "@/lib/api/auth-client"
import { PASSWORD_REGEX } from "@/lib/user-rules"

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter()
  const t = useTranslations("auth")
  const tCommon = useTranslations("common")
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
      <AuthCard title={t("resetPassword.invalidTitle")} description={invalidMessage ?? undefined}>
        <div className="flex justify-center">
          <Link
            href="/auth/login"
            className="text-sm font-semibold text-foreground underline underline-offset-4"
          >
            {t("backToLogin")}
          </Link>
        </div>
      </AuthCard>
    )
  }

  return (
    <AuthCard
      title={t("resetPassword.setNewPasswordTitle")}
      description={t("resetPassword.description")}
      onSubmit={async (event) => {
        event.preventDefault()

        if (!PASSWORD_REGEX.test(password)) {
          toast.error(tCommon("passwordHint"))
          return
        }
        if (password !== confirm) {
          toast.error(t("resetPassword.passwordsMismatch"))
          return
        }

        setIsSubmitting(true)
        try {
          await confirmPasswordReset(token, password)
          toast.success(t("resetPassword.resetSuccess"))
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
        label={t("resetPassword.newPassword")}
        type="password"
        placeholder={t("resetPassword.newPassword")}
        autoComplete="new-password"
        required
        value={password}
        onChange={(event) => setPassword(event.target.value)}
      />

      <AuthField
        id="confirm-password"
        label={t("resetPassword.confirmPassword")}
        type="password"
        placeholder={t("resetPassword.confirmPassword")}
        autoComplete="new-password"
        required
        value={confirm}
        onChange={(event) => setConfirm(event.target.value)}
      />

      <AuthSubmit loading={isSubmitting}>{t("resetPasswordLink")}</AuthSubmit>
    </AuthCard>
  )
}