import type { Subject } from "@/types"

export function subjectNameMap(subjects: Subject[]): Map<string, string> {
  return new Map(subjects.map((s) => [s.id, s.name]))
}

export function subjectIconMap(subjects: Subject[]): Map<string, string> {
  return new Map(subjects.map((s) => [s.id, s.icon]))
}