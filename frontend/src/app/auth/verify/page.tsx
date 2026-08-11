import { Suspense } from "react"
import { VerifyEmailContent } from "@/components/auth/verify-email"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Verify Email",
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailContent />
    </Suspense>
  )
}
