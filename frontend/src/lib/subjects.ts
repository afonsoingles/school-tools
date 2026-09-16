import type { Subject } from "@/types"

export interface SubjectColorOption {
  name: string
  swatch: string
  block: string
}

export const SUBJECT_COLORS: SubjectColorOption[] = [
  { name: "blue", swatch: "bg-blue-500", block: "bg-blue-600 text-white hover:bg-blue-500" },
  { name: "emerald", swatch: "bg-emerald-500", block: "bg-emerald-600 text-white hover:bg-emerald-500" },
  { name: "violet", swatch: "bg-violet-500", block: "bg-violet-600 text-white hover:bg-violet-500" },
  { name: "amber", swatch: "bg-amber-500", block: "bg-amber-500 text-white hover:bg-amber-400" },
  { name: "cyan", swatch: "bg-cyan-500", block: "bg-cyan-600 text-white hover:bg-cyan-500" },
  { name: "fuchsia", swatch: "bg-fuchsia-500", block: "bg-fuchsia-600 text-white hover:bg-fuchsia-500" },
  { name: "indigo", swatch: "bg-indigo-500", block: "bg-indigo-600 text-white hover:bg-indigo-500" },
  { name: "teal", swatch: "bg-teal-500", block: "bg-teal-600 text-white hover:bg-teal-500" },
  { name: "rose", swatch: "bg-rose-500", block: "bg-rose-600 text-white hover:bg-rose-500" },
  { name: "orange", swatch: "bg-orange-500", block: "bg-orange-600 text-white hover:bg-orange-500" },
  { name: "lime", swatch: "bg-lime-500", block: "bg-lime-600 text-white hover:bg-lime-500" },
  { name: "sky", swatch: "bg-sky-500", block: "bg-sky-600 text-white hover:bg-sky-500" },
]

export const DEFAULT_SUBJECT_COLOR = "blue"

export function subjectNameMap(subjects: Subject[]): Map<string, string> {
  return new Map(subjects.map((s) => [s.id, s.name]))
}

export function subjectIconMap(subjects: Subject[]): Map<string, string> {
  return new Map(subjects.map((s) => [s.id, s.icon]))
}

export function subjectColorMap(subjects: Subject[]): Map<string, string> {
  return new Map(subjects.map((s) => [s.id, s.color ?? DEFAULT_SUBJECT_COLOR]))
}

export function getSubjectBlockClass(color?: string | null): string {
  return SUBJECT_COLORS.find((c) => c.name === color)?.block ?? SUBJECT_COLORS[0].block
}

export function getSubjectSwatchClass(color?: string | null): string {
  return SUBJECT_COLORS.find((c) => c.name === color)?.swatch ?? SUBJECT_COLORS[0].swatch
}
