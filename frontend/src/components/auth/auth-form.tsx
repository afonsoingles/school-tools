import * as React from "react"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function AuthTitle({ children }: { children: React.ReactNode }) {
  return <h1 className="text-4xl font-bold tracking-tight text-center text-foreground">{children}</h1>
}

type AuthFieldProps = { label: string } & React.ComponentProps<"input">

export function AuthField({ id, label, ...props }: AuthFieldProps) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id} className="text-base font-semibold">
        {label}
      </Label>
      <Input id={id} className="h-12 text-base" {...props} />
    </div>
  )
}

export function AuthError({ message }: { message?: string | null }) {
  return (
    <div className="flex min-h-10 items-center justify-center px-2 text-sm text-center text-destructive">
      {message}
    </div>
  )
}

export function AuthSubmit({ loading, children }: { loading: boolean; children: React.ReactNode }) {
  return (
    <Button type="submit" size="lg" className="h-12 text-base" disabled={loading}>
      {loading && <Loader2 className="animate-spin" />}
      {children}
    </Button>
  )
}

export function AuthFooterLink({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-center text-muted-foreground">{children}</p>
}
