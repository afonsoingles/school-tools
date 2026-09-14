import { ResetRequestForm } from "@/components/auth/reset-request-form"
import { RedirectIfAuthed } from "@/components/auth/redirect-if-authed"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Forgot password",
}

export default function ResetRequestPage() {
  return (
    <RedirectIfAuthed>
      <ResetRequestForm />
    </RedirectIfAuthed>
  )
}