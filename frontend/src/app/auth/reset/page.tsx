import { ResetPasswordForm } from "@/components/auth/reset-password-form"
import { RedirectIfAuthed } from "@/components/auth/redirect-if-authed"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Reset password",
}

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>
}) {
  const { token } = await searchParams
  const tokenValue = typeof token === "string" ? token : ""

  return (
    <RedirectIfAuthed>
      <ResetPasswordForm token={tokenValue} />
    </RedirectIfAuthed>
  )
}