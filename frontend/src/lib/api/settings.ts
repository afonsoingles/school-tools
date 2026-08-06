import { mockResolve } from "@/lib/api/client"
import type { AppSettings, Subject } from "@/types"

export async function getSettings(): Promise<AppSettings> {
  return mockResolve({
    subjects: [],
    theme: "dark",
    notificationsEnabled: true,
  })
}

export async function getSubjects(): Promise<Subject[]> {
  return mockResolve([])
}