import { PageHeader } from "@/components/layout/page-header"
import { HomeworkManager } from "@/components/homework/homework-manager"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Homework",
}

export default function HomeworkPage() {
  return (
    <>
      <PageHeader title="Homework" subtitle="Track homework across your different subjects" />
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <div className="flex flex-col px-4 pb-4 md:px-8 md:pb-6">
          <HomeworkManager />
        </div>
      </div>
    </>
  )
}