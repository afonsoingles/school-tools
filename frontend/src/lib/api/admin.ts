import { apiFetch } from "@/lib/api/client"
import type {
  AdminUserContent,
  AdminUserContentType,
  AdoptionStats,
  FunctionalityStats,
  User,
  UserStats,
} from "@/types"

export interface AdminUserPatch {
  name?: string
  email?: string
  timezone?: string
  email_verified?: boolean
}

export type PromoteRole = "admin" | "superadmin" | "user"

export interface AdminUserListParams {
  limit?: number
  offset?: number
  search?: string
  verified?: boolean
  banned?: boolean
  role?: "admin" | "superadmin" | "user"
  sort?: "created_at" | "updated_at" | "name" | "email"
  order?: "asc" | "desc"
}

export interface AdminUserListResponse {
  success: boolean
  users: User[]
  total: number
}

export async function getAdminUsers(params: AdminUserListParams = {}): Promise<AdminUserListResponse> {
  const searchParams = new URLSearchParams()
  if (params.limit !== undefined) searchParams.set("limit", String(params.limit))
  if (params.offset !== undefined) searchParams.set("offset", String(params.offset))
  if (params.search) searchParams.set("search", params.search)
  if (params.verified !== undefined) searchParams.set("verified", String(params.verified))
  if (params.banned !== undefined) searchParams.set("banned", String(params.banned))
  if (params.role) searchParams.set("role", params.role)
  const qs = searchParams.toString()
  return apiFetch<AdminUserListResponse>(`/v1/admin/users${qs ? `?${qs}` : ""}`)
}

export async function getAdminUser(userId: string): Promise<User> {
  const res = await apiFetch<{ success: boolean; user: User }>(`/v1/admin/users/${userId}`)
  return res.user
}

export async function getUserContent<C extends AdminUserContentType>(
  userId: string,
  contentType: C
): Promise<AdminUserContent<C>> {
  const res = await apiFetch<{ success: boolean; content: AdminUserContent<C> }>(
    `/v1/admin/users/${userId}/${contentType}`
  )
  return res.content
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
    `/v1/admin/users/${userId}/actions/resend_verification_email`,
    { method: "POST" }
  )
  return res.message
}

export async function suspendUser(userId: string, reason: string): Promise<string> {
  const res = await apiFetch<{ success: boolean; message: string }>(
    `/v1/admin/users/${userId}/actions/suspend`,
    { method: "POST", body: JSON.stringify({ reason }) }
  )
  return res.message
}

export async function unsuspendUser(userId: string): Promise<string> {
  const res = await apiFetch<{ success: boolean; message: string }>(
    `/v1/admin/users/${userId}/actions/unsuspend`,
    { method: "POST" }
  )
  return res.message
}

export async function promoteUser(userId: string, role: PromoteRole): Promise<string> {
  const res = await apiFetch<{ success: boolean; message: string }>(
    `/v1/admin/users/${userId}/actions/promote/${role}`,
    { method: "POST" }
  )
  return res.message
}

async function fetchStats<T>(path: string): Promise<T> {
  const res = await apiFetch<{ success: boolean; stats: T }>(path)
  return res.stats
}

function runAdminAction(path: string): Promise<string> {
  return apiFetch<{ success: boolean; message: string }>(path, {
    method: "POST",
  }).then((res) => res.message)
}

export const getUserStats = (): Promise<UserStats> => fetchStats<UserStats>("/v1/admin/stats/user")

export const getAdoptionStats = (): Promise<AdoptionStats> =>
  fetchStats<AdoptionStats>("/v1/admin/stats/adoption")

export const getFunctionalityStats = (): Promise<FunctionalityStats> =>
  fetchStats<FunctionalityStats>("/v1/admin/stats/functionality")

export const adminRefreshStats = (): Promise<string> => runAdminAction("/v1/admin/stats")

export const adminClearGlobalUserCache = (): Promise<string> =>
  runAdminAction("/v1/admin/development/db/nuke_users_cache")

export const adminNukeRedis = (): Promise<string> =>
  runAdminAction("/v1/admin/development/db/nuke_redis")

export const adminForceGeneratePendingFeeds = (): Promise<string> =>
  runAdminAction("/v1/admin/development/calendar/force_feed_generation")