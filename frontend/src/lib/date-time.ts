function pad(n: number): string {
  return String(n).padStart(2, "0")
}

const WEEKDAY_MAP: Record<string, number> = { sun: 7, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 }

export const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
export const DAY_FULL = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
export const WEEKDAY_NAMES = ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

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

export function formatInTz(date: Date, tz: string, options: Intl.DateTimeFormatOptions): string {
  return date.toLocaleString("en-GB", { timeZone: tz, ...options })
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

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number)
  if (Number.isNaN(h) || Number.isNaN(m)) return 0
  return h * 60 + m
}

export function formatDateDdMmYyyy(dateStr: string): string {
  const [y, m, d] = dateStr.split("-")
  return `${d}/${m}/${y}`
}

export function formatDateDmy(value: string): string {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
}

export function formatDateWeekday(dateStr: string): string {
  const [y, m, d] = dateStr.split("-")
  const date = new Date(Number(y), Number(m) - 1, Number(d))
  return date.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })
}