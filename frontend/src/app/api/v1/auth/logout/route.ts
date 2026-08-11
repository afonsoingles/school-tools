import { NextResponse } from "next/server"

import { clearSessionCookie, getSessionToken } from "@/lib/auth/session"
import { SERVER_API_BASE } from "@/lib/api/server-client"

export async function POST() {
  const token = await getSessionToken()

  const res = await fetch(`${SERVER_API_BASE}/v1/auth/logout`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    redirect: "manual",
  })

  await clearSessionCookie()

  const body = await res.json().catch(() => null)
  return NextResponse.json(body, { status: res.status })
}
