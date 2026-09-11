import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import { Button } from "@/components/ui/button"
import { UserDetails } from "@/components/admin/user-page"
import { getCurrentUser } from "@/lib/api/auth"
import { serverGetAdminUser } from "@/lib/api/admin-server"
import { ApiError } from "@/lib/api/client"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ userId: string }>
}): Promise<Metadata> {
  const { userId } = await params
  let name: string | null = null
  try {
    const detail = await serverGetAdminUser(userId)
    name = detail.name
  } catch {}

  return {
    title: name ? `${name}` : "User/Users/Admin",
  }
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
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <div className="flex flex-1 flex-col gap-4 px-4 pt-4 pb-4 md:px-8 md:pt-6 md:pb-6">
          <Button
            render={<Link href="/admin" />}
            variant="ghost"
            size="sm"
            nativeButton={false}
            className="-ml-2 w-fit gap-1.5 text-muted-foreground hover:bg-foreground/10! hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" />
            All users
          </Button>
          <div className="flex flex-col items-start gap-4">
            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/25 rounded-md px-3 py-2">
              {raw ?? "This user could not be loaded. Check that the account still exists."}
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <div className="flex flex-1 flex-col gap-4 px-4 pt-4 pb-4 md:px-8 md:pt-6 md:pb-6">
        <Button
          render={<Link href="/admin" />}
          variant="ghost"
          size="sm"
          nativeButton={false}
          className="-ml-2 w-fit gap-1.5 text-muted-foreground hover:bg-foreground/10! hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          All users
        </Button>
        <div className="flex flex-col gap-8">
          <UserDetails initial={detail} />
        </div>
      </div>
    </div>
  )
}