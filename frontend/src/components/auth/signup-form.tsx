"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { toast } from "sonner"

import { AuthCard, AuthField, AuthSubmit } from "@/components/auth/auth-form"

export function SignupForm() {
  const router = useRouter()
  const t = useTranslations("auth")
  const tCommon = useTranslations("common")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  return (
    <AuthCard
      title={t("signup.title")}
      description={t("signup.description")}
      footer={
        <>
          {t("signup.alreadyHaveAccount")}{" "}
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
          const res = await fetch("/api/v1/auth/signup", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name,
              email,
              password,
              timezone: Intl.DateTimeFormat().resolvedOptions().timeZone ?? "Etc/Universal",
            }),
          })

          if (!res.ok) {
            const body = await res.json().catch(() => null)
            toast.error(
              body?.code === "email_already_registered"
                ? t("signup.emailAlreadyRegistered")
                : (body?.message ?? t("signup.couldNotCreateAccount"))
            )
            return
          }

          const loginRes = await fetch("/api/v1/auth/pwd", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
          })

          if (!loginRes.ok) {
            router.push("/auth/login")
            return
          }

          router.push("/auth/verify/pending")
          router.refresh()
        } catch {
          toast.error(tCommon("state.error"))
        } finally {
          setIsSubmitting(false)
        }
      }}
    >
      <AuthField
        id="name"
        label={tCommon("fields.name")}
        placeholder={tCommon("fields.name")}
        autoComplete="name"
        required
        value={name}
        onChange={(event) => setName(event.target.value)}
      />

      <AuthField
        id="email"
        label={tCommon("fields.email")}
        type="email"
        placeholder={tCommon("fields.email")}
        autoComplete="email"
        required
        hint={t("signup.emailHint")}
        value={email}
        onChange={(event) => setEmail(event.target.value)}
      />

      <AuthField
        id="password"
        label={t("password")}
        type="password"
        placeholder={t("password")}
        autoComplete="new-password"
        required
        value={password}
        onChange={(event) => setPassword(event.target.value)}
      />

      <AuthSubmit loading={isSubmitting}>{t("signup.title")}</AuthSubmit>
    </AuthCard>
  )
}