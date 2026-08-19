import { NextResponse, type NextRequest } from "next/server"

import { clearSessionCookie } from "@/lib/auth/session"

export async function GET(request: NextRequest) {
  await clearSessionCookie()
  return NextResponse.redirect("/auth/login")
}
