import { PageHeader } from "@/components/layout/page-header"
import { EvaluationsManager } from "@/components/evaluations/evaluations-manager"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Evaluations",
}
export default function EvaluationsPage() {
  return (
    <>
      <PageHeader title="Evaluations" subtitle="exams, quizzes and other assessments" />
      <div className="flex flex-col flex-1 min-h-0 px-8 pb-6">
        <EvaluationsManager />
      </div>
    </>
  )
}