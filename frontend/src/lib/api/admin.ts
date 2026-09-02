import { apiFetch } from "@/lib/api/client"
import type {
  AdminUserDetail,
  CancelledClassEvent,
  ClassEvent,
  Evaluation,
  Subject,
  User,
} from "@/types"

export interface AdminUserPatch {
  name?: string
  email?: string
  timezone?: string
  active?: boolean
  admin?: boolean
  superadmin?: boolean
  email_verified?: boolean
}

export interface AdminUserDetailResponse {
  success: boolean
  user: User
  classes: ClassEvent[]
  cancelled_classes: CancelledClassEvent[]
  evaluations: Evaluation[]
  subjects: Subject[]
}

export function mapAdminUserDetail(res: AdminUserDetailResponse): AdminUserDetail {
  return {
    ...res.user,
    classes: res.classes,
    cancelled_classes: res.cancelled_classes,
    evaluations: res.evaluations,
    subjects: res.subjects,
  }
}

export async function getUsers(): Promise<User[]> {
  const res = await apiFetch<{ success: boolean; users: User[] }>("/v1/admin/users")
  return res.users
}

export async function getAdminUser(userId: string): Promise<AdminUserDetail> {
  const res = await apiFetch<AdminUserDetailResponse>(`/v1/admin/users/${userId}`)
  return mapAdminUserDetail(res)
}

export async function updateAdminUser(userId: string, patch: AdminUserPatch): Promise<User> {
  const res = await apiFetch<{ success: boolean; user: User }>(`/v1/admin/users/${userId}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  })
  return res.user
}

export async function resendVerificationEmail(userId: string): Promise<string> {
  const res = await apiFetch<{ success: boolean; message: string }>(
    `/v1/admin/users/${userId}/resend_verification_email`,
    { method: "POST" }
  )
  return res.message
}

export async function adminClearGlobalUserCache(): Promise<string> {
  const res = await apiFetch<{ success: boolean; message: string }>(
    "/v1/admin/dev/clear_global_user_cache",
    { method: "POST" }
  )
  return res.message
}

export async function adminNukeRedis(): Promise<string> {
  const res = await apiFetch<{ success: boolean; message: string }>("/v1/admin/dev/nuke_redis", {
    method: "POST",
  })
  return res.message
}

export async function adminForceGeneratePendingFeeds(): Promise<string> {
  const res = await apiFetch<{ success: boolean; message: string }>(
    "/v1/admin/force_generate_pending_feeds",
    { method: "POST" }
  )
  return res.message
}