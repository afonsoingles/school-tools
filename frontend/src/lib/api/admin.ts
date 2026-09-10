import { apiFetch } from "@/lib/api/client"
import type {
  AdminUserDetail,
  AdoptionStats,
  CancelledClassEvent,
  ClassEvent,
  Evaluation,
  FunctionalityStats,
  Subject,
  User,
  UserStats,
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