import { PageHeader } from "@/components/layout/page-header"
import { DashboardOverview } from "@/components/dashboard/dashboard-overview"
import { getCurrentUser } from "@/lib/api/auth"

export const metadata = {
  title: "Dashboard",
}

export default async function DashboardPage() {
  let userName = ""
  try {
    const user = await getCurrentUser()
    userName = user.name
  } catch {
    // auth handled by the (app) layout
  }

  const todayLabel = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  })

  return (
    <>
      <PageHeader title={userName ? `Hello, ${userName}` : "Hello"} subtitle={todayLabel} />
      <div className="flex flex-col flex-1 min-h-0 px-8 pb-6">
        <DashboardOverview />
      </div>
    </>
  )
}