import { PageHeader } from "@/components/layout/page-header"
import { HomeworkManager } from "@/components/homework/homework-manager"
import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("homework")
  return { title: t("pageTitle") }
}

export default async function HomeworkPage() {
  const t = await getTranslations("homework")

  return (
    <>
      <PageHeader title={t("pageTitle")} subtitle={t("pageSubtitle")} />
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <div className="flex flex-col px-4 pb-4 md:px-8 md:pb-6">
          <HomeworkManager />
        </div>
      </div>
    </>
  )
}