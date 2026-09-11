import { serverApiFetch } from "@/lib/api/server-client"
import type { User } from "@/types"

export async function serverGetAdminUser(userId: string): Promise<User> {
  const res = await serverApiFetch<{ success: boolean; user: User }>(`/v1/admin/users/${userId}`)
  return res.user
}