"use client"

import { useState } from "react"
import Link from "next/link"
import { toast } from "sonner"

import { requestPasswordReset } from "@/lib/api/auth-client"
import { AuthCard, AuthField, AuthSubmit } from "@/components/auth/auth-form"
import { MailCheck, Mail } from "lucide-react"

export function ResetRequestForm() {
  const [email, setEmail] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [sent, setSent] = useState(false)

  if (sent) {
    return (
      <AuthCard title="Check your email" footer={<>Back to{" "}
          <Link
            href="/auth/login"
            className="font-semibold underline text-foreground underline-offset-4"
          >
            login
          </Link>
        </>}
      >
        <div className="flex flex-col items-center gap-3 text-center">
          <MailCheck className="size-8 text-foreground" />
          <p className="text-sm text-muted-foreground">
            If an account exists for that email, we sent you a link to reset your password. Check
            your inbox.
          </p>
        </div>
      </AuthCard>
    )
  }

  return (
    <AuthCard
      title="Reset password"
      description="Enter your email and we&apos;ll send you a reset link."
      footer={
        <>
          Remembered it?{" "}
          <Link
            href="/auth/login"
            className="font-semibold underline text-foreground underline-offset-4"
          >
            Login
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
          toast.error(err instanceof Error ? err.message : "Something went wrong. Please try again.")
        } finally {
          setIsSubmitting(false)
        }
      }}
    >
      <AuthField
        id="email"
        label="Email"
        type="email"
        placeholder="Email"
        autoComplete="email"
        required
        value={email}
        onChange={(event) => setEmail(event.target.value)}
      />

      <AuthSubmit loading={isSubmitting}>
        <Mail className="size-4" />
        Send reset link
      </AuthSubmit>
    </AuthCard>
  )
}