import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Check your email",
}


export default function VerifyEmailPendingPage() {
  return (
    <div className="flex flex-col items-center w-full max-w-sm gap-3 text-center">
      <h1 className="text-4xl font-bold tracking-tight text-center text-foreground">Check your email</h1>
      <p className="text-base text-muted-foreground">
        We sent you an email with a link to verify your email address. Please check your inbox and click the link to continue.
      </p>
    </div>
  )
}