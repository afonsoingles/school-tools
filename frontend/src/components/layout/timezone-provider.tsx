"use client"

import { createContext, useContext } from "react"

const TimezoneContext = createContext<string | undefined>(undefined)

export function TimezoneProvider({
  timezone,
  children,
}: {
  timezone?: string
  children: React.ReactNode
}) {
  return <TimezoneContext.Provider value={timezone}>{children}</TimezoneContext.Provider>
}

export function useTimezone(): string {
  const tz = useContext(TimezoneContext)
  if (tz) return tz
  if (typeof Intl !== "undefined") {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "Etc/UTC"
  }
  return "Etc/UTC"
}
