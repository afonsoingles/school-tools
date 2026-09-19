import { ResetRequestForm } from "@/components/auth/reset-request-form"
import { RedirectIfAuthed } from "@/components/auth/redirect-if-authed"
import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth")
  return { title: t("meta.forgotPassword") }
}

export default function ResetRequestPage() {
  return (
    <RedirectIfAuthed>
      <ResetRequestForm />
    </RedirectIfAuthed>
  )
}