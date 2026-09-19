import { PageHeader } from "@/components/layout/page-header"
import { HomeworkDetail } from "@/components/homework/homework-detail"
import { serverApiFetch } from "@/lib/api/server-client"
import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import type { Homework } from "@/types"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const t = await getTranslations("homework")
  try {
    const res = await serverApiFetch<{ success: boolean; homework: Homework[] }>("/v1/homework")
    const hw = res.homework.find((h) => h.id === id)
    return { title: hw?.title ? `${hw.title} - ${t("detailTitle")}` : t("detailTitle") }
  } catch {
    return { title: t("detailTitle") }
  }
}

export default async function HomeworkDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const t = await getTranslations("homework")

  return (
    <>
      <PageHeader title={t("detailTitle")} subtitle={t("detailSubtitle")} />
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <div className="flex flex-col px-4 pb-4 md:px-8 md:pb-6">
          <HomeworkDetail id={id} />
        </div>
      </div>
    </>
  )
}