import { apiFetch } from "@/lib/api/client"

export interface PendingReconciliation {
  id: string
  class_id: string
  date: string
  type: "exam" | "quiz" | "other"
  subject: string
}

export interface TestSheetState {
  success: boolean
  enabled: boolean
  stock: { lined: number; graph: number }
  low: boolean
  pending: PendingReconciliation[]
}

export async function getTestSheets(): Promise<TestSheetState> {
  return apiFetch<TestSheetState>("/v1/test-sheets")
}

export async function updateTestSheetStock(
  lined: number,
  graph: number,
  action: "add" | "remove"
): Promise<TestSheetState> {
  return apiFetch<TestSheetState>("/v1/test-sheets/stock", {
    method: "PATCH",
    body: JSON.stringify({ lined, graph, action }),
  })
}

export async function reconcileTestSheets(
  evaluationId: string,
  lined: number,
  graph: number
): Promise<TestSheetState> {
  return apiFetch<TestSheetState>("/v1/test-sheets/reconcile", {
    method: "POST",
    body: JSON.stringify({ evaluation_id: evaluationId, lined, graph }),
  })
}
