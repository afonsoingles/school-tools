function pad(n: number): string {
  return String(n).padStart(2, "0")
}

export interface TzParts {
  y: number
  m: number
  d: number
  h: number
  min: number
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
  }).formatToParts(date)
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? ""
  return {
    y: Number(get("year")),
    m: Number(get("month")),
    d: Number(get("day")),
    h: Number(get("hour")),
    min: Number(get("minute")),
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