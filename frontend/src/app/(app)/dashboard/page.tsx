import { PageHeader } from "@/components/layout/page-header"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Dashboard",
}
export default function DashboardPage() {
  return (
    <>
      <PageHeader title="Dashboard" subtitle="okay" />
      <div className="flex-1 px-8 py-6" />
    </>
  )
}