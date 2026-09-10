import type { Metadata } from "next"
import { UsersManager } from "@/components/admin/users-manager"

export const metadata: Metadata = {
  title: "Users/Admin",
}

export default function AdminUsersPage() {
  return <UsersManager />
}