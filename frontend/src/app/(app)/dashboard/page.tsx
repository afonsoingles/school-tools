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
      <PageHeader
        className="max-md:hidden"
        title={userName ? `Hello, ${userName}` : "Hello"}
        subtitle={todayLabel}
      />
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <div className="flex flex-col pt-4 px-4 pb-4 md:pt-0 md:px-8 md:pb-6">
          <DashboardOverview />
        </div>
      </div>
    </>
  )
}