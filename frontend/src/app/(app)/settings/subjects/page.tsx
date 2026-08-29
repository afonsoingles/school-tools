import { SubjectsManager } from "@/components/settings/subjects-manager"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Settings — Subjects",
}

export default function SettingsSubjectsPage() {
  return <SubjectsManager />
}