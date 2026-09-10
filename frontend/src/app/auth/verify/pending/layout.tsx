import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/api/auth"

export default async function VerifyPendingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  try {
    const user = await getCurrentUser()
    if (user.email_verified) {
      redirect("/dashboard")
    }
  } catch {}

  return children
}