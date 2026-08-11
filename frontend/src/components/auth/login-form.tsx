"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"

import {
  AuthError,
  AuthField,
  AuthFooterLink,
  AuthSubmit,
  AuthTitle,
} from "@/components/auth/auth-form"

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get("next") ?? "/dashboard"

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  return (
    <form
      className="flex flex-col w-full max-w-sm gap-6"
      onSubmit={async (event) => {
        event.preventDefault()
        setError(null)
        setIsSubmitting(true)

        try {
          const res = await fetch("/api/v1/auth/pwd", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
          })

          if (!res.ok) {
            const body = await res.json().catch(() => null)
            setError(body?.message ?? "Invalid email or password.")
            return
          }

          router.push(next)
          router.refresh()
        } catch {
          setError("Something went wrong. Please try again.")
        } finally {
          setIsSubmitting(false)
        }
      }}
    >
      <AuthTitle>Login</AuthTitle>

      <AuthError message={error} />

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

      <AuthField
        id="password"
        label="Password"
        type="password"
        placeholder="Password"
        autoComplete="current-password"
        required
        value={password}
        onChange={(event) => setPassword(event.target.value)}
      />

      <AuthSubmit loading={isSubmitting}>Login</AuthSubmit>

      <AuthFooterLink>
        Need an account?{" "}
        <Link
          href="/auth/signup"
          className="font-semibold underline text-foreground underline-offset-4"
        >
          Sign up
        </Link>
      </AuthFooterLink>
    </form>
  )
}
