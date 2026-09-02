export interface User {
  id: string
  name: string
  email: string
  email_verified: boolean
  active: boolean
  admin: boolean
  superadmin: boolean
  timezone: string
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

export interface HomeworkItem {
  id: string
  title: string
  subject: string
  dueDate: string // ISO 8601
  done: boolean
}

export interface Evaluation {
  id: string
  class_id: string
  date: string 
  type: "exam" | "quiz" | "other"
}

export interface Subject {
  id: string
  name: string
}

export interface ClassEvent {
  id: string
  subject_id: string
  weekday: number  // 1=Mon…7=Sun
  start_time: string  // "HH:MM"
  end_time: string  // "HH:MM"
}

export interface CancelledClassEvent {
  id: string
  class_id: string
  date: string  // "YYYY-MM-DD"
  reason: "break" | "public_holiday" | "other"
}

export interface DashboardSummary {
  upcomingEvents: CalendarEvent[]
  pendingHomework: HomeworkItem[]
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