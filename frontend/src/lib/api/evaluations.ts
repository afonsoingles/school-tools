import { mockResolve } from "@/lib/api/client"
import type { Evaluation } from "@/types"

export async function getEvaluations(): Promise<Evaluation[]> {
  return mockResolve([])
}