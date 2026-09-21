export interface User {
  id: string
  name: string
  email: string
  email_verified: boolean
  active: boolean
  admin: boolean
  superadmin: boolean
  timezone: string
  locale: string
  created_at: string
  updated_at: string
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface SignupPayload extends LoginCredentials {
  name: string
  timezone: string
}

export interface ApiErrorBody {
  success: false,
  code: string,
  message: string
}

export interface AuthResponse {
  token: string
  user: User
}

export interface MessageResponse {
  message: string
}
export interface CalendarEvent {
  id: string
  title: string
  subject: string
  start: string // ISO 8601
  end: string
  type: "class" | "test" | "personal"
}

export type HomeworkStatus = "not_started" | "ongoing" | "finished"

export interface Homework {
  id: string
  subject_id: string
  title: string
  description: string
  status: HomeworkStatus
  due_date: string // ISO 8601 datetime
}

export interface Evaluation {
  id: string
  class_id: string
  date: string 
  type: "exam" | "quiz" | "worksheet" | "report" | "other"
  grade?: number | null
}

export interface Subject {
  id: string
  name: string
  icon: string
  color: string
}

export type CancellationReason = "break" | "public_holiday" | "other"

export interface ClassSchedule {
  id: string
  chain_id: string
  scheduled_weekday: number // 1=Mon…7=Sun
  start_time: string // "HH:MM"
  end_time: string // "HH:MM"
  valid_from: string // "YYYY-MM-DD"
  valid_until: string | null // "YYYY-MM-DD"; null = still active
}

export interface ClassCancellation {
  id: string
  date: string // "YYYY-MM-DD"
  reason: CancellationReason
  note?: string | null
}

export interface ClassEvent {
  id: string
  subject_id: string
  schedules: ClassSchedule[]
  cancellations: ClassCancellation[]
}

export interface DayCancellation {
  id: string
  date: string // "YYYY-MM-DD"
  reason: CancellationReason
  note?: string | null
}

export interface CancelledClassEvent {
  id: string
  class_id: string | null
  date: string // "YYYY-MM-DD"
  reason: CancellationReason
  note?: string | null
}

export interface DashboardSummary {
  upcomingEvents: CalendarEvent[]
  pendingHomework: Homework[]
  recentEvaluations: Evaluation[]
}

export interface AppSettings {
  subjects: Subject[]
  theme: "dark"
  notificationsEnabled: boolean
}

export interface CalendarFeeds {
  classes: string
  evaluations: string
}

export interface AdminUserDetail extends User {
  classes: ClassEvent[]
  cancelled_classes: CancelledClassEvent[]
  evaluations: Evaluation[]
  subjects: Subject[]
}

export type AdminUserContentType = "subjects" | "classes" | "cancellations" | "evaluations" | "homework"

export type AdminUserContent<C extends AdminUserContentType> = C extends "subjects"
  ? Subject[]
  : C extends "classes"
    ? ClassEvent[]
    : C extends "cancellations"
      ? CancelledClassEvent[]
      : C extends "evaluations"
        ? Evaluation[]
        : C extends "homework"
          ? Homework[]
          : never

export interface UserStats {
  total: number
  verified: number
  unverified: number
  active: number
  inactive: number
  new_7d: number
  new_30d: number
  computed_at: string
}

export interface AdoptionStats {
  homework: number
  evaluations: number
  subjects: number
  classes: number
  cancellations: number
  ics: number
  computed_at: string
}

export interface FunctionalityStats {
  homework: number
  evaluations: number
  subjects: number
  classes: number
  cancellations: number
  computed_at: string
}

export interface ApiKey {
  id: string
  name: string
  prefix: string
  created_at: string
  last_used_at: string | null
  revoked: boolean
}

export type AuditVia = "web" | "api"

export interface AuditLog {
  id: string
  user_id: string
  action: string
  resource: string
  resource_id: string | null
  summary: string
  via: AuditVia
  created_at: string
}

export type NotificationType =
  | "evaluation"
  | "homework"
  | "holiday"
  | "cancelled_class"
  | "admin"
  | "test_sheet_stock"
  | "test_sheet_reconcile"
  | "deletion"

export interface Notification {
  id: string
  user_id: string
  type: NotificationType
  title: string
  body: string
  deep_link: string | null
  read: boolean
  created_at: string
  pushed_at: string | null
}

export type DeletionStatus = "pending" | "approved" | "reversed" | "completed"

export interface DeletionRequest {
  id: string
  user_id: string
  email: string
  name: string
  reason: string
  status: DeletionStatus
  nominated: boolean
  requested_at: string
  reviewed_at: string | null
  reviewed_by: string | null
  scheduled_purge_at: string | null
  reversed_at: string | null
  completed_at: string | null
}