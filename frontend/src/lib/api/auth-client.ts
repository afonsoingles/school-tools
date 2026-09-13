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