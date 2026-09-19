import { Suspense } from "react"
import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { LoginForm } from "@/components/auth/login-form"
import { RedirectIfAuthed } from "@/components/auth/redirect-if-authed"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth")
  return {
    title: t("loginForm.title"),
    description: t("meta.loginDescription"),
  }
}

export default function LoginPage() {
  return (
    <RedirectIfAuthed>
      <Suspense>
        <LoginForm />
      </Suspense>
    </RedirectIfAuthed>
  )
}