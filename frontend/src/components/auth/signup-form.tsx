"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import {
  AuthError,
  AuthField,
  AuthFooterLink,
  AuthSubmit,
  AuthTitle,
} from "@/components/auth/auth-form"

export function SignupForm() {
  const router = useRouter()
  const [name, setName] = useState("")
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
            setError(
              body?.code === "email_already_registered"
                ? "This email is already registered."
                : (body?.message ?? "Could not create account.")
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
          setError("Something went wrong. Please try again.")
        } finally {
          setIsSubmitting(false)
        }
      }}
    >
      <AuthTitle>Create account</AuthTitle>

      <AuthField
        id="name"
        label="Name"
        placeholder="Name"
        autoComplete="name"
        required
        value={name}
        onChange={(event) => setName(event.target.value)}
      />

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
        autoComplete="new-password"
        required
        value={password}
        onChange={(event) => setPassword(event.target.value)}
      />

      <AuthSubmit loading={isSubmitting}>Create account</AuthSubmit>

      <AuthError message={error} />

      <AuthFooterLink>
        Already have an account?{" "}
        <Link
          href="/auth/login"
          className="font-semibold underline text-foreground underline-offset-4"
        >
          Login
        </Link>
      </AuthFooterLink>
    </form>
  )
}
