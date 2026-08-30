import { NextResponse, type NextRequest } from "next/server"

import { clearSessionCookie, getSessionToken } from "@/lib/auth/session"
import { SERVER_API_BASE } from "@/lib/api/server-client"
import { setForwardedClientIp } from "@/lib/net/client-ip"

export async function POST(request: NextRequest) {
  const token = await getSessionToken()

  const headers = new Headers(token ? { Authorization: `Bearer ${token}` } : {})
  setForwardedClientIp(headers, request)

  const res = await fetch(`${SERVER_API_BASE}/v1/auth/logout`, {
    method: "POST",
    headers,
    redirect: "manual",
  })

  await clearSessionCookie()

  const body = await res.json().catch(() => null)
  return NextResponse.json(body, { status: res.status })
}
