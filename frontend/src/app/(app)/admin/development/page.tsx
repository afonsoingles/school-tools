import type { Metadata } from "next"
import { getCurrentUser } from "@/lib/api/auth"
import { DevTools } from "@/components/admin/dev-tools"

export const metadata: Metadata = {
  title: "DevTools/Admin",
}

export default async function AdminDevelopmentPage() {
  const user = await getCurrentUser()
  return <DevTools isSuperadmin={user.superadmin} />
}