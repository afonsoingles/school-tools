export function pad(n: number): string {
  return String(n).padStart(2, "0")
}

const WEEKDAY_MAP: Record<string, number> = { sun: 7, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 }

export const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
export const DAY_FULL = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
export const WEEKDAY_NAMES = ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

const DAY_NAMES_PT = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"]
const DAY_FULL_PT = ["Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado", "Domingo"]
const WEEKDAY_NAMES_PT = ["", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"]

function isPt(locale: string): boolean {
  return locale.toLowerCase().startsWith("pt")
}

export function dayNamesShort(locale: string): string[] {
  return isPt(locale) ? DAY_NAMES_PT : DAY_NAMES
}

export function dayNamesFull(locale: string): string[] {
  return isPt(locale) ? DAY_FULL_PT : DAY_FULL
}

export function weekdayNamesShort(locale: string): string[] {
  return isPt(locale) ? WEEKDAY_NAMES_PT : WEEKDAY_NAMES
}

export interface TzParts {
  y: number
  m: number
  d: number
  h: number
  min: number
  weekday: number
}

export function getTzParts(tz: string, date: Date): TzParts {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    weekday: "short",
  }).formatToParts(date)
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? ""
  return {
    y: Number(get("year")),
    m: Number(get("month")),
    d: Number(get("day")),
    h: Number(get("hour")),
    min: Number(get("minute")),
    weekday: WEEKDAY_MAP[get("weekday").toLowerCase()] ?? 1,
  }
}

export function formatInTz(date: Date, tz: string, options: Intl.DateTimeFormatOptions, locale: string = "en-GB"): string {
  return date.toLocaleString(locale, { timeZone: tz, ...options })
}

export function toDateTimeInput(date: Date, tz: string): string {
  const { y, m, d, h, min } = getTzParts(tz, date)
  return `${y}-${pad(m)}-${pad(d)}T${pad(h)}:${pad(min)}`
}

export function tzDateFromParts(tz: string, y: number, m: number, d: number, h: number, min: number): Date {
  let guess = new Date(Date.UTC(y, m - 1, d, h, min))
  for (let i = 0; i < 2; i++) {
    const parts = getTzParts(tz, guess)
    const wall = Date.UTC(parts.y, parts.m - 1, parts.d, parts.h, parts.min)
    const offset = wall - guess.getTime()
    guess = new Date(Date.UTC(y, m - 1, d, h, min) - offset)
  }
  return guess
}

export function datePart(iso: string): string {
  return iso.includes("T") ? iso.split("T")[0] : iso
}

export function isoDateString(y: number, m: number, d: number): string {
  return `${y}-${pad(m)}-${pad(d)}`
}

export function tzDateString(tz: string, date: Date): string {
  const { y, m, d } = getTzParts(tz, date)
  return isoDateString(y, m, d)
}

export function todayDateString(): string {
  const today = new Date()
  return isoDateString(today.getFullYear(), today.getMonth() + 1, today.getDate())
}

export function isUpcoming(dateStr: string, todayStr: string): boolean {
  return datePart(dateStr) >= todayStr
}

export function weekdayFromDateStr(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number)
  const day = new Date(y, m - 1, d).getDay()
  return day === 0 ? 7 : day
}

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number)
  if (Number.isNaN(h) || Number.isNaN(m)) return 0
  return h * 60 + m
}

export function formatDateDdMmYyyy(dateStr: string): string {
  // `created_at`/`last_used_at` vêm da API como datetime ISO ("2026-09-19T14:30:00+00:00").
  // Corta a parte do tempo (T...) para ficar só com a data antes de a partir por "-".
  const [datePart, _timePart] = dateStr.split("T")
  const [y, m, d] = datePart.split("-")
  return `${d}/${m}/${y}`
}

export function formatDateDmy(value: string, locale: string = "en-GB"): string {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" })
}

export function formatDateWeekday(dateStr: string, locale: string = "en-GB"): string {
  const [y, m, d] = dateStr.split("-")
  const date = new Date(Number(y), Number(m) - 1, Number(d))
  return date.toLocaleDateString(locale, { weekday: "short", day: "numeric", month: "short" })
}