"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { safeNextPath } from "@/lib/utils"

import { AuthCard, AuthField, AuthSubmit } from "@/components/auth/auth-form"

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const t = useTranslations("auth")
  const tCommon = useTranslations("common")
  const next = safeNextPath(searchParams.get("next") ?? "/dashboard")

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  return (
    <AuthCard
      title={t("loginForm.title")}
      description={t("loginForm.description")}
      footer={
        <>
          {t("loginForm.noAccount")}{" "}
          <Link
            href="/auth/signup"
            className="font-semibold underline text-foreground underline-offset-4"
          >
            {t("loginForm.signUp")}
          </Link>
        </>
      }
      onSubmit={async (event) => {
        event.preventDefault()
        setIsSubmitting(true)

        try {
          const res = await fetch("/api/v1/auth/pwd", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
          })

          if (!res.ok) {
            const body = await res.json().catch(() => null)
            toast.error(body?.message ?? t("loginForm.invalidCredentials"))
            return
          }

          router.push(next)
          router.refresh()
        } catch {
          toast.error(tCommon("state.error"))
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

      <AuthField
        id="password"
        label={t("password")}
        type="password"
        placeholder={t("password")}
        autoComplete="current-password"
        required
        value={password}
        onChange={(event) => setPassword(event.target.value)}
      />

      <Link
        href="/auth/reset/request"
        className="self-start text-sm text-muted-foreground hover:text-foreground underline-offset-4"
      >
        {t("loginForm.forgotPassword")}
      </Link>

      <AuthSubmit loading={isSubmitting}>{t("login")}</AuthSubmit>
    </AuthCard>
  )
}