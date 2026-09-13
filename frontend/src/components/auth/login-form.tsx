"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { safeNextPath } from "@/lib/utils"

import { AuthCard, AuthField, AuthSubmit } from "@/components/auth/auth-form"

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = safeNextPath(searchParams.get("next") ?? "/dashboard")

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  return (
    <AuthCard
      title="Login"
      description="Welcome back to School Tools"
      footer={
        <>
          Don't have an account?{" "}
          <Link
            href="/auth/signup"
            className="font-semibold underline text-foreground underline-offset-4"
          >
            Sign up
          </Link>
        </>
      }
      onSubmit={async (event) => {
        event.preventDefault()
        setIsSubmitting(true)

        try {
          const res = await fetch("/api/v1/auth/pwd", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
          })

          if (!res.ok) {
            const body = await res.json().catch(() => null)
            toast.error(body?.message ?? "Invalid email or password.")
            return
          }

          router.push(next)
          router.refresh()
        } catch {
          toast.error("Something went wrong. Please try again.")
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
    </AuthCard>
  )
}