import { serverApiFetch } from "@/lib/api/server-client"
import type { User } from "@/types"

export async function getCurrentUser(): Promise<User> {
  const res = await serverApiFetch<{ success: true; user: User }>("/v1/auth/me")
  return res.user
}
