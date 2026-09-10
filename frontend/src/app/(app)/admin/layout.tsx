import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/api/auth"
import { PageHeader } from "@/components/layout/page-header"
import { AdminNav } from "@/components/admin/admin-nav"

export const metadata: Metadata = {
  title: {
    default: "Admin",
    template: "%s · School Tools",
  },
}

const isDev = process.env.NODE_ENV === "development"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()
  if (!user.admin) redirect("/dashboard")

  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      <div className="flex min-h-full flex-col">
        <PageHeader
          className="max-md:hidden"
          title="Admin"
          subtitle="hello, it's a beautiful day to be an admin!"
        />
        <AdminNav isDev={isDev} />
        <div className="flex flex-1 flex-col px-4 pb-[max(env(safe-area-inset-bottom),1rem)] md:px-8 md:pb-6">
          {children}
        </div>
      </div>
    </div>
  )
}