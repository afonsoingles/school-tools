import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/layout/page-header"
import { UserDetails } from "@/components/admin/user-page"
import { getCurrentUser } from "@/lib/api/auth"
import { serverGetAdminUser } from "@/lib/api/admin-server"
import { ApiError } from "@/lib/api/client"

export const metadata: Metadata = {
  title: "User details",
}

export default async function AdminUserDetailsPage({
  params,
}: {
  params: Promise<{ userId: string }>
}) {
  const { userId } = await params

  const currentUser = await getCurrentUser()
  if (!currentUser.admin) {
    redirect("/dashboard")
  }

  let detail
  try {
    detail = await serverGetAdminUser(userId)
  } catch (err) {
    const raw =
      err instanceof ApiError ? (err.body as { message?: string } | null)?.message : undefined
    return (
      <>
        <PageHeader title="User details" subtitle="Could not load this user." />
        <div className="flex flex-col items-start gap-4 px-8 py-6">
          <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/25 rounded-md px-3 py-2">
            {raw ?? "This user could not be loaded. Check that the account still exists."}
          </p>
          <Button render={<Link href="/admin" />} variant="outline" nativeButton={false} className="gap-1.5">
            <ArrowLeft className="size-3.5" />
            Back to all users
          </Button>
        </div>
      </>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <div className="flex items-center px-8 pt-6">
        <Button render={<Link href="/admin" />} variant="outline" size="sm" nativeButton={false} className="gap-1.5">
          <ArrowLeft className="size-3.5" />
          Back to users
        </Button>
      </div>
      <PageHeader title={detail.name} subtitle=""/>
      <div className="flex flex-col gap-8 px-8">
        <UserDetails initial={detail} />
      </div>
    </div>
  )
}