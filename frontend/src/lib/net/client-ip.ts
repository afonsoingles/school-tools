import type { NextRequest } from "next/server"

export function getRequestClientIp(request: NextRequest): string | undefined {
  const realIp = request.headers.get("x-real-ip")?.trim()
  if (realIp) return realIp

  const forwardedFor = request.headers.get("x-forwarded-for")
  const first = forwardedFor?.split(",")[0]?.trim()
  return first || undefined
}

export function setForwardedClientIp(headers: Headers, request: NextRequest): void {
  const clientIp = getRequestClientIp(request)
  if (clientIp) {
    headers.set("x-forwarded-for", clientIp)
  } else {
    headers.delete("x-forwarded-for")
  }
}