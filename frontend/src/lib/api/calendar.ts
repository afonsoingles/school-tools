import { apiFetch, mockResolve } from "@/lib/api/client"
import type { AppSettings, ClassEvent, CanceledClassEvent, Subject } from "@/types"

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

export async function getClasses(): Promise<ClassEvent[]> {
  const res = await apiFetch<{ success: boolean; classes: ClassEvent[] }>("/v1/classes/schedule")
  return res.classes
}

function normalizeDate(d: string): string {
  return d.includes("T") ? d.split("T")[0] : d
}

export async function getCancellations(): Promise<CanceledClassEvent[]> {
  const res = await apiFetch<{ success: boolean; cancellations: CanceledClassEvent[] }>("/v1/classes/cancellations")
  return res.cancellations.map((c) => ({ ...c, date: normalizeDate(c.date) }))
}

interface CreateClassPayload {
  subject_id: string
  weekday: number
  start_time: string
  end_time: string
}

export async function createClass(payload: CreateClassPayload): Promise<ClassEvent> {
  const res = await apiFetch<{ success: boolean; class: ClassEvent }>("/v1/classes", {
    method: "POST",
    body: JSON.stringify({
      subject_id: payload.subject_id,
      weekday: String(payload.weekday),
      start_time: payload.start_time,
      end_time: payload.end_time,
    }),
  })
  return res.class
}

export async function deleteClass(classId: string): Promise<void> {
  await apiFetch<{ success: boolean }>(`/v1/classes/${classId}`, {
    method: "DELETE",
  })
}

export async function cancelClass(classId: string, date: string, reason: string): Promise<CanceledClassEvent> {
  const res = await apiFetch<{ success: boolean; cancellation: CanceledClassEvent }>(
    `/v1/classes/${classId}/cancel`,
    {
      method: "POST",
      body: JSON.stringify({ date, reason }),
    }
  )
  const c = res.cancellation
  return { ...c, date: normalizeDate(c.date) }
}

export async function uncancelClass(cancellationId: string): Promise<void> {
  await apiFetch<{ success: boolean }>("/v1/classes/uncancel", {
    method: "POST",
    body: JSON.stringify({ cancellation_id: cancellationId }),
  })
}
