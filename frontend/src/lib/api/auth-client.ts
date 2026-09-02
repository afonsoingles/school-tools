export async function resendVerificationEmailClient(): Promise<string> {
  const res = await fetch("/api/v1/auth/verify/resend", { method: "POST" })

  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.message ?? "Could not resend the verification email.")
  }

  const body = await res.json().catch(() => null)
  return body?.message ?? "Verification email sent!"
}