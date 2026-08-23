import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const SESSION_COOKIE = "school_tools_session"
const PROTECTED_PREFIXES = ["/dashboard", "/calendar", "/homework", "/evaluations", "/settings", "/admin"]
const AUTH_PAGES = ["/auth/login", "/auth/signup"]

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const hasSession = request.cookies.has(SESSION_COOKIE)

  const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  const isAuthPage = AUTH_PAGES.some((prefix) => pathname.startsWith(prefix))

  if (isProtected && !hasSession) {
    const loginUrl = new URL("/auth/login", request.url)
    loginUrl.searchParams.set("next", pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (isAuthPage && hasSession) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/calendar/:path*",
    "/homework/:path*",
    "/evaluations/:path*",
    "/settings/:path*",
    "/admin/:path*",
    "/auth/login",
    "/auth/signup",
  ],
}
