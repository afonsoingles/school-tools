import { redirect } from "next/navigation"

import { getCurrentUser } from "@/lib/api/auth"
import { PageHeader } from "@/components/layout/page-header"
import { ClearCacheButton } from "@/components/admin/clear-cache-button"

export default async function AdminPage() {
  const user = await getCurrentUser()
  if (!user.admin) redirect("/dashboard")

  return (
    <>
      <PageHeader title="Admin options" subtitle="bits and bobs for admins. use with responsibility" />
      <div className="flex-1 px-8 py-6">
        <ClearCacheButton />
      </div>
    </>
  )
}
