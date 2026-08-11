import { apiFetch, type RequestOptions } from "@/lib/api/client"
import { getSessionToken } from "@/lib/auth/session"

export const SERVER_API_BASE = process.env.API_URL ?? "http://localhost:8000"

export async function serverApiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const token = await getSessionToken()

  return apiFetch<T>(path, {
    ...options,
    baseUrl: SERVER_API_BASE,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })
}
