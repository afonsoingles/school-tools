import type { Metadata } from "next"
import { DeletionsManager } from "@/components/admin/deletions-manager"
import { getCurrentUser } from "@/lib/api/auth"

export const metadata: Metadata = {
  title: "Deletions/Admin",
}

export default async function AdminDeletionsPage() {
  const user = await getCurrentUser()
  return <DeletionsManager isSuperadmin={user.superadmin} />
}
