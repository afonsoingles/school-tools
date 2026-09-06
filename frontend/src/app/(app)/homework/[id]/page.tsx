import { PageHeader } from "@/components/layout/page-header"
import { HomeworkDetail } from "@/components/homework/homework-detail"
import { serverApiFetch } from "@/lib/api/server-client"
import type { Metadata } from "next"
import type { Homework } from "@/types"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  try {
    const res = await serverApiFetch<{ success: boolean; homework: Homework[] }>("/v1/homework")
    const hw = res.homework.find((h) => h.id === id)
    return { title: hw?.title ? `${hw.title} - Homework` : "Homework" }
  } catch {
    return { title: "Homework" }
  }
}

export default async function HomeworkDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return (
    <>
      <PageHeader title="Homework" subtitle="Homework details" />
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <div className="flex flex-col px-4 pb-4 md:px-8 md:pb-6">
          <HomeworkDetail id={id} />
        </div>
      </div>
    </>
  )
}