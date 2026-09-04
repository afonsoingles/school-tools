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
      <div className="flex flex-col flex-1 min-h-0 px-8 pb-6">
        <HomeworkManager />
      </div>
    </>
  )
}