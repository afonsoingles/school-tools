import { Suspense } from "react"

import { VerifyEmailContent } from "@/components/auth/verify-email"

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailContent />
    </Suspense>
  )
}
