import { apiFetch } from "@/lib/api/client"
import type { DeletionRequest } from "@/types"

interface MyDeletionResponse {
  success: boolean
  request: DeletionRequest | null
}

export async function getMyDeletionRequest(): Promise<DeletionRequest | null> {
  const res = await apiFetch<MyDeletionResponse>("/v1/deletions/me")
  return res.request
}

export async function requestAccountDeletion(reason: string): Promise<DeletionRequest> {
  const res = await apiFetch<{ success: boolean; message: string; request: DeletionRequest }>(
    "/v1/deletions/request",
    { method: "POST", body: JSON.stringify({ reason }) }
  )
  return res.request
}
