import { apiFetch, mockResolve } from "@/lib/api/client"
import type { AppSettings, ClassEvent, DayCancellation, Subject } from "@/types"

export async function getSettings(): Promise<AppSettings> {
  return mockResolve({
    subjects: [],
    theme: "dark",
    notificationsEnabled: true,
  })
}

export async function getSubjects(): Promise<Subject[]> {
  const res = await apiFetch<{ success: boolean; subjects: Subject[] }>("/v1/subjects")
  return res.subjects
}

export async function createSubject(name: string): Promise<Subject> {
  const res = await apiFetch<{ success: boolean; subject: Subject }>("/v1/subjects", {
    method: "POST",
    body: JSON.stringify({ name }),
  })
  return res.subject
}

export async function renameSubject(subjectId: string, newName: string): Promise<Subject> {
  const res = await apiFetch<{ success: boolean; subject: Subject }>(`/v1/subjects/${subjectId}`, {
    method: "PATCH",
    body: JSON.stringify({ new_name: newName }),
  })
  return res.subject
}

export async function deleteSubject(subjectId: string): Promise<void> {
  await apiFetch<{ success: boolean }>(`/v1/subjects/${subjectId}`, {
    method: "DELETE",
  })
}

export interface ClassScheduleData {
  classes: ClassEvent[]
  dayCancellations: DayCancellation[]
}

export async function getClassSchedule(): Promise<ClassScheduleData> {
  const res = await apiFetch<{ success: boolean; classes: ClassEvent[]; day_cancellations: DayCancellation[] }>("/v1/classes")
  return { classes: res.classes, dayCancellations: res.day_cancellations }
}

export async function getClasses(): Promise<ClassEvent[]> {
  const { classes } = await getClassSchedule()
  return classes
}

export interface NewSchedulePayload {
  scheduled_weekday: number
  start_time: string
  end_time: string
}

export async function createClass(payload: {
  subject_id: string
  schedules: NewSchedulePayload[]
}): Promise<ClassEvent> {
  const res = await apiFetch<{ success: boolean; class: ClassEvent }>("/v1/classes", {
    method: "POST",
    body: JSON.stringify({
      subject_id: payload.subject_id,
      schedules: payload.schedules.map((s) => ({
        ...s,
        scheduled_weekday: String(s.scheduled_weekday),
      })),
    }),
  })
  return res.class
}

export async function updateClassSubject(classId: string, subjectId: string): Promise<ClassEvent> {
  const res = await apiFetch<{ success: boolean; class: ClassEvent }>(`/v1/classes/${classId}`, {
    method: "PATCH",
    body: JSON.stringify({ subject_id: subjectId }),
  })
  return res.class
}

export async function deleteClass(classId: string): Promise<void> {
  await apiFetch<{ success: boolean }>(`/v1/classes/${classId}`, {
    method: "DELETE",
  })
}

export async function addSchedule(classId: string, payload: NewSchedulePayload): Promise<ClassEvent> {
  const res = await apiFetch<{ success: boolean; class: ClassEvent }>(
    `/v1/classes/${classId}/schedules`,
    {
      method: "POST",
      body: JSON.stringify({ ...payload, scheduled_weekday: String(payload.scheduled_weekday) }),
    }
  )
  return res.class
}

export async function reschedule(
  classId: string,
  scheduleId: string,
  payload: NewSchedulePayload & { date?: string }
): Promise<ClassEvent> {
  const res = await apiFetch<{ success: boolean; class: ClassEvent }>(
    `/v1/classes/${classId}/schedules/${scheduleId}`,
    {
      method: "PATCH",
      body: JSON.stringify({
        ...payload,
        scheduled_weekday: String(payload.scheduled_weekday),
        ...(payload.date ? { date: payload.date } : {}),
      }),
    }
  )
  return res.class
}

export async function deleteSchedule(classId: string, scheduleId: string): Promise<ClassEvent> {
  const res = await apiFetch<{ success: boolean; class: ClassEvent }>(
    `/v1/classes/${classId}/schedules/${scheduleId}`,
    { method: "DELETE" }
  )
  return res.class
}

export interface ClassCancellationResult {
  id: string
  date: string
  reason: string
  note?: string | null
}

export async function cancelClass(
  classId: string,
  date: string,
  reason: string,
  note?: string
): Promise<ClassCancellationResult> {
  const res = await apiFetch<{ success: boolean; cancellation: ClassCancellationResult }>(
    `/v1/classes/${classId}/cancel`,
    {
      method: "POST",
      body: JSON.stringify({ date, reason, ...(note ? { note } : {}) }),
    }
  )
  return res.cancellation
}

export async function uncancelClass(classId: string, cancellationId: string): Promise<void> {
  await apiFetch<{ success: boolean }>(`/v1/classes/${classId}/cancellations/${cancellationId}`, {
    method: "DELETE",
  })
}

export async function cancelDay(date: string, reason: string, note?: string): Promise<DayCancellation> {
  const res = await apiFetch<{ success: boolean; day_cancellation: DayCancellation }>(
    "/v1/classes/cancel-day",
    {
      method: "POST",
      body: JSON.stringify({ date, reason, ...(note ? { note } : {}) }),
    }
  )
  return res.day_cancellation
}

export async function uncancelDay(dayCancellationId: string): Promise<void> {
  await apiFetch<{ success: boolean }>(`/v1/classes/cancel-day/${dayCancellationId}`, {
    method: "DELETE",
  })
}