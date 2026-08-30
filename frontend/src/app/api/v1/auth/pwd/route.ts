import { NextResponse, type NextRequest } from "next/server"

import { setSessionCookie } from "@/lib/auth/session"
import { SERVER_API_BASE } from "@/lib/api/server-client"
import { setForwardedClientIp } from "@/lib/net/client-ip"

export async function POST(request: NextRequest) {
  const headers = new Headers({ "Content-Type": "application/json" })
  setForwardedClientIp(headers, request)

  const res = await fetch(`${SERVER_API_BASE}/v1/auth/pwd`, {
    method: "POST",
    headers,
    body: await request.text(),
    redirect: "manual",
  })

  const body = await res.json().catch(() => null)

  if (!res.ok || !body?.token) {
    return NextResponse.json(
      body ?? { success: false, code: "unknown", message: "Authentication failed" },
      { status: res.status }
    )
  }

  await setSessionCookie(body.token)

  const safe = { ...body }
  delete safe.token
  return NextResponse.json(safe, { status: res.status })
}
