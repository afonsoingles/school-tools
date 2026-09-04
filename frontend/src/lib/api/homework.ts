import { apiFetch } from "@/lib/api/client"
import type { Homework, HomeworkStatus } from "@/types"

export async function getHomework(): Promise<Homework[]> {
  const res = await apiFetch<{ success: boolean; homework: Homework[] }>("/v1/homework")
  return res.homework
}

export interface HomeworkPayload {
  subject_id: string
  title: string
  description: string
  due_date: string
  status: HomeworkStatus
}

export async function createHomework(payload: {
  subject_id: string
  title: string
  description: string
  due_date: string
}): Promise<Homework> {
  const res = await apiFetch<{ success: boolean; homework: Homework }>("/v1/homework", {
    method: "POST",
    body: JSON.stringify(payload),
  })
  return res.homework
}

export async function updateHomework(
  homeworkId: string,
  payload: HomeworkPayload
): Promise<Homework> {
  const res = await apiFetch<{ success: boolean; homework: Homework }>(
    `/v1/homework/${homeworkId}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    }
  )
  return res.homework
}

export async function deleteHomework(homeworkId: string): Promise<void> {
  await apiFetch<{ success: boolean }>(`/v1/homework/${homeworkId}`, {
    method: "DELETE",
  })
}