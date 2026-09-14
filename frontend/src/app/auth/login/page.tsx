import { Suspense } from "react"
import type { Metadata } from "next"
import { LoginForm } from "@/components/auth/login-form"
import { RedirectIfAuthed } from "@/components/auth/redirect-if-authed"

export const metadata: Metadata = {
  title: "Login",
  description: "Login to your School Tools account"
}

export default function LoginPage() {
  return (
    <RedirectIfAuthed>
      <Suspense>
        <LoginForm />
      </Suspense>
    </RedirectIfAuthed>
  )
}