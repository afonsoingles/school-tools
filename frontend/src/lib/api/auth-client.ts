import type { User } from "@/types"

export async function resendVerificationEmailClient(): Promise<string> {
  const res = await fetch("/api/v1/auth/verify/resend", { method: "POST" })

  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.message ?? "Could not resend the verification email.")
  }

  const body = await res.json().catch(() => null)
  return body?.message ?? "Verification email sent!"
}

export async function getCurrentUserClient(): Promise<User | null> {
  const res = await fetch("/api/v1/auth/me")

  if (res.status === 401) return null
  if (!res.ok) throw new Error("Could not fetch the current user.")

  const body = await res.json().catch(() => null)
  return body?.user ?? null
}

export async function requestPasswordReset(email: string): Promise<string> {
  const res = await fetch("/api/v1/auth/password_reset/request", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.message ?? "Could not request a password reset.")
  }

  const body = await res.json().catch(() => null)
  return body?.message ?? "If the provided email is registered, a password reset link has been sent to it."
}

export async function isValidPasswordResetToken(token: string): Promise<boolean> {
  const res = await fetch("/api/v1/auth/password_reset/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  })

  if (res.status === 401) return false
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.message ?? "Could not validate the password reset token.")
  }

  const body = await res.json().catch(() => null)
  return body?.valid === true
}

export async function confirmPasswordReset(token: string, newPassword: string): Promise<string> {
  const res = await fetch("/api/v1/auth/password_reset/confirm", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, new_password: newPassword }),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.message ?? "Could not reset your password.")
  }

  const body = await res.json().catch(() => null)
  return body?.message ?? "Your password has been reset successfully!"
}