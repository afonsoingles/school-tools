"use client"

import { useState } from "react"
import Link from "next/link"
import { useTranslations } from "next-intl"
import { toast } from "sonner"

import { requestPasswordReset } from "@/lib/api/auth-client"
import { AuthCard, AuthField, AuthSubmit } from "@/components/auth/auth-form"
import { MailCheck, Mail } from "lucide-react"

export function ResetRequestForm() {
  const t = useTranslations("auth")
  const tCommon = useTranslations("common")
  const [email, setEmail] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [sent, setSent] = useState(false)

  if (sent) {
    return (
      <AuthCard
        title={t("resetRequest.sentTitle")}
        footer={
          <>
            {t("resetRequest.backTo")}{" "}
            <Link
              href="/auth/login"
              className="font-semibold underline text-foreground underline-offset-4"
            >
              {t("resetRequest.loginLink")}
            </Link>
          </>
        }
      >
        <div className="flex flex-col items-center gap-3 text-center">
          <MailCheck className="size-8 text-foreground" />
          <p className="text-sm text-muted-foreground">{t("resetRequest.sentBody")}</p>
        </div>
      </AuthCard>
    )
  }

  return (
    <AuthCard
      title={t("resetPasswordLink")}
      description={t("resetRequest.description")}
      footer={
        <>
          {t("resetRequest.rememberedIt")}{" "}
          <Link
            href="/auth/login"
            className="font-semibold underline text-foreground underline-offset-4"
          >
            {t("login")}
          </Link>
        </>
      }
      onSubmit={async (event) => {
        event.preventDefault()
        setIsSubmitting(true)

        try {
          await requestPasswordReset(email)
          setSent(true)
        } catch (err) {
          toast.error(err instanceof Error ? err.message : tCommon("state.error"))
        } finally {
          setIsSubmitting(false)
        }
      }}
    >
      <AuthField
        id="email"
        label={tCommon("fields.email")}
        type="email"
        placeholder={tCommon("fields.email")}
        autoComplete="email"
        required
        value={email}
        onChange={(event) => setEmail(event.target.value)}
      />

      <AuthSubmit loading={isSubmitting}>
        <Mail className="size-4" />
        {t("resetRequest.sendResetLink")}
      </AuthSubmit>
    </AuthCard>
  )
}