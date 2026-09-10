import type { Metadata } from "next"
import { getCurrentUser } from "@/lib/api/auth"
import { StatsOverview } from "@/components/admin/stats-overview"

export const metadata: Metadata = {
  title: "Stats/Admin",
}

export default async function AdminStatsPage() {
  const user = await getCurrentUser()
  return <StatsOverview isSuperadmin={user.superadmin} />
}