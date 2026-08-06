import { mockResolve } from "@/lib/api/client"
import type { DashboardSummary } from "@/types"

export async function getDashboardSummary(): Promise<DashboardSummary> {
  return mockResolve({
    upcomingEvents: [],
    pendingHomework: [],
    recentEvaluations: [],
  })
}