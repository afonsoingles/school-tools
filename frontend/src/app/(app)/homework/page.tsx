import { PageHeader } from "@/components/layout/page-header"
import { redirect } from "next/navigation"

export default function DashboardPage() {
  redirect("/dashboard")
  return (
    <>
      <PageHeader title="Homework" subtitle="See your homework, i guess?" />
      <div className="flex-1 px-8 py-6" />
    </>
  )
}