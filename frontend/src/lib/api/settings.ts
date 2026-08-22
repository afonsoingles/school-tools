import { apiFetch, mockResolve } from "@/lib/api/client"
import type { AppSettings, Subject } from "@/types"

interface SubjectResponse {
  success: boolean
  subject: Subject
}

interface SubjectsResponse {
  success: boolean
  subjects: Subject[]
}

export async function getSettings(): Promise<AppSettings> {
  return mockResolve({
    subjects: [],
    theme: "dark",
    notificationsEnabled: true,
  })
}

export async function getSubjects(): Promise<Subject[]> {
  const res = await apiFetch<SubjectsResponse>("/v1/subjects")
  return res.subjects
}

export async function createSubject(name: string): Promise<Subject> {
  const res = await apiFetch<SubjectResponse>("/v1/subjects", {
    method: "POST",
    body: JSON.stringify({ name }),
  })
  return res.subject
}

export async function renameSubject(subjectId: string, newName: string): Promise<Subject> {
  const res = await apiFetch<SubjectResponse>(`/v1/subjects/${subjectId}`, {
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
