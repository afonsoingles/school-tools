import { NextResponse, type NextRequest } from "next/server"

import { getSessionToken } from "@/lib/auth/session"
import { SERVER_API_BASE } from "@/lib/api/server-client"
import { setForwardedClientIp } from "@/lib/net/client-ip"

const HOP_BY_HOP_HEADERS = [
  "connection",
  "content-length",
  "host",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]

async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname.replace(/^\/api/, "") || "/"
  const url = `${SERVER_API_BASE}${path}${request.nextUrl.search}`

  const headers = new Headers(request.headers)
  for (const name of HOP_BY_HOP_HEADERS) {
    headers.delete(name)
  }
  setForwardedClientIp(headers, request)

  const token = await getSessionToken()
  if (token && !headers.has("authorization")) {
    headers.set("authorization", `Bearer ${token}`)
  }

  const res = await fetch(url, {
    method: request.method,
    headers,
    body: request.method === "GET" || request.method === "HEAD" ? undefined : await request.arrayBuffer(),
    redirect: "manual",
  })

  const responseHeaders = new Headers(res.headers)
  responseHeaders.delete("content-encoding")
  responseHeaders.delete("content-length")

  return new NextResponse(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers: responseHeaders,
  })
}

export { proxy as DELETE, proxy as GET, proxy as HEAD, proxy as OPTIONS, proxy as PATCH, proxy as POST, proxy as PUT }
