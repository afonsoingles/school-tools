import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/api/auth"

export async function RedirectIfAuthed({ children }: { children: React.ReactNode }) {
  let authed = false
  try {
    await getCurrentUser()
    authed = true
  } catch {
    // not logged in — show the auth page
  }

  if (authed) redirect("/dashboard")

  return children
}