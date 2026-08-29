import { redirect } from "next/navigation"
import type { Metadata } from "next"
import { getCurrentUser } from "@/lib/api/auth"
import { PageHeader } from "@/components/layout/page-header"
import { ClearCacheButton } from "@/components/admin/clear-cache-button"
import { ForceGenerateButton } from "@/components/admin/force-generate-button"

export const metadata: Metadata = {
  title: "Admin",
}

export default async function AdminPage() {
  const user = await getCurrentUser()
  if (!user.admin) redirect("/dashboard")

  return (
    <>
      <PageHeader title="Admin options" subtitle="bits and bobs for admins. use with responsibility" />
      <div className="flex flex-1 flex-col gap-6 px-8 py-6">
        <ClearCacheButton />
        <ForceGenerateButton />
      </div>
    </>
  )
}
