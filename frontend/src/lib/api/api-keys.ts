import { apiFetch } from "@/lib/api/client"
import type { ApiKey } from "@/types"

interface ApiKeyResponse {
  success: boolean
  api_key: ApiKey
  raw_key?: string
}

interface ApiKeysResponse {
  success: boolean
  api_keys: ApiKey[]
}

export async function createApiKey(name: string): Promise<{ key: ApiKey; rawKey: string }> {
  const res = await apiFetch<ApiKeyResponse>("/v1/account/api-keys", {
    method: "POST",
    body: JSON.stringify({ name }),
  })
  return { key: res.api_key, rawKey: res.raw_key ?? "" }
}

export async function getApiKeys(): Promise<ApiKey[]> {
  const res = await apiFetch<ApiKeysResponse>("/v1/account/api-keys")
  return res.api_keys
}

export async function revokeApiKey(keyId: string): Promise<void> {
  await apiFetch<{ success: boolean }>(`/v1/account/api-keys/${keyId}`, {
    method: "DELETE",
  })
}