import { mockResolve } from "@/lib/api/client"
import type { HomeworkItem } from "@/types"

export async function getHomework(): Promise<HomeworkItem[]> {
  return mockResolve([])
}