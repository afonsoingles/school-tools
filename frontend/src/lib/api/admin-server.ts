import { serverApiFetch } from "@/lib/api/server-client"
import type { AdminUserDetail } from "@/types"
import { mapAdminUserDetail, type AdminUserDetailResponse } from "@/lib/api/admin"

export async function serverGetAdminUser(userId: string): Promise<AdminUserDetail> {
  const res = await serverApiFetch<AdminUserDetailResponse>(`/v1/admin/users/${userId}`)
  return mapAdminUserDetail(res)
}