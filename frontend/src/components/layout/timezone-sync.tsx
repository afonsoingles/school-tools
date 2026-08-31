"use client"

import { useEffect } from "react"

function getBrowserTimezone(): string {
  if (typeof Intl !== "undefined") {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "Etc/UTC"
  }
  return "Etc/UTC"
}

export function TimezoneSync() {
  useEffect(() => {
    let cancelled = false
    const timezone = getBrowserTimezone()

    const run = async () => {
      try {
        const res = await fetch("/api/v1/auth/me", {
          method: "GET",
          headers: { "X-Timezone": timezone },
          cache: "no-store",
        })
        if (!res.ok || cancelled) return
      } catch {
        // Best-effort sync; ignore failures.
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [])

  return null
}
