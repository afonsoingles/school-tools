import { apiFetch } from "@/lib/api/client"
import type { Evaluation } from "@/types"

export async function getEvaluations(): Promise<Evaluation[]> {
  const res = await apiFetch<{ success: boolean; evaluations: Evaluation[] }>("/v1/evaluations")
  return res.evaluations
}

export async function createEvaluation(payload: {
  class_id: string
  type: string
  date: string
}): Promise<Evaluation> {
  const res = await apiFetch<{ success: boolean; evaluation: Evaluation }>("/v1/evaluations", {
    method: "POST",
    body: JSON.stringify({
      class_id: payload.class_id,
      type: payload.type,
      date: payload.date,
    }),
  })
  return res.evaluation
}

export async function deleteEvaluation(evaluationId: string): Promise<void> {
  await apiFetch<{ success: boolean }>(`/v1/evaluations/${evaluationId}`, {
    method: "DELETE",
  })
}