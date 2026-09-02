import { redirect } from "next/navigation"
import type { Metadata } from "next"
import { getCurrentUser } from "@/lib/api/auth"
import { PageHeader } from "@/components/layout/page-header"
import { UsersManager } from "@/components/admin/users-manager"
import { DevTools } from "@/components/admin/dev-tools"

export const metadata: Metadata = {
  title: "Admin",
}

const isDev = process.env.NODE_ENV === "development"

export default async function AdminPage() {
  const user = await getCurrentUser()
  if (!user.admin) redirect("/dashboard")

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <PageHeader title="Admin options" subtitle="bits and bobs for admins. use with responsibility" />
      <div className="flex flex-col gap-8 px-8 py-6">
        <UsersManager />
        {isDev && <DevTools />}
      </div>
    </div>
  )
}