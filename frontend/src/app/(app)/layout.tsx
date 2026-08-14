import { redirect } from "next/navigation"

import { AppSidebar } from "@/components/layout/app-sidebar"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { getCurrentUser } from "@/lib/api/auth"
import type { User } from "@/types"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  let user: User

  try {
    user = await getCurrentUser()
  } catch {
    redirect("/api/auth/clear-session")
  }

  if (!user.email_verified) {
    redirect("/auth/verify/pending")
  }

  return (
    <SidebarProvider>
      <AppSidebar user={user} />
      <SidebarInset>
        <div className="flex flex-col flex-1 min-h-svh">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}