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
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <div className="flex flex-col px-4 pb-4 md:px-8 md:pb-6">
          <EvaluationsManager />
        </div>
      </div>
    </>
  )
}