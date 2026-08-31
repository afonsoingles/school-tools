import { redirect } from "next/navigation"
import * as Sentry from "@sentry/nextjs"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { TimezoneProvider } from "@/components/layout/timezone-provider"
import { TimezoneSync } from "@/components/layout/timezone-sync"
import { getCurrentUser } from "@/lib/api/auth"
import type { User } from "@/types"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  let user: User

  try {
    user = await getCurrentUser()
    Sentry.setUser({ id: user.id, email: user.email })
  } catch {
    redirect("/api/auth/clear-session")
  }

  if (!user.email_verified) {
    redirect("/auth/verify/pending")
  }

  return (
    <TimezoneProvider timezone={user.timezone}>
      <TimezoneSync />
      <SidebarProvider className="min-h-0! h-dvh!">
        <AppSidebar user={user} />
        <SidebarInset className="overflow-hidden!">
          <div className="flex flex-col flex-1 min-h-0">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </TimezoneProvider>
  )
}