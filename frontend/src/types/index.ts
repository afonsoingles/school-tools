export interface User {
  id: string
  name: string
  email: string
  avatarUrl?: string
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
  subject: string
  title: string
  grade: number
  maxGrade: number
  date: string // ISO 8601
}

export interface Subject {
  id: string
  name: string
  color: string
  teacher?: string
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