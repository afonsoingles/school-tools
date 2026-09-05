"use client"

import * as React from "react"
import { Info, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export function AuthTitle({ children }: { children: React.ReactNode }) {
  return <h1 className="text-4xl font-bold tracking-tight text-center text-foreground">{children}</h1>
}

type AuthFieldProps = { label: string; hint?: string } & React.ComponentProps<"input">

export function AuthField({ id, label, hint, ...props }: AuthFieldProps) {
  const [hintOpen, setHintOpen] = React.useState(false)

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-start gap-1">
        <Label htmlFor={id} className="text-base font-semibold">
          {label}
        </Label>
        {hint && (
          <TooltipProvider delay={0}>
            <Tooltip open={hintOpen} onOpenChange={setHintOpen}>
              <TooltipTrigger
                className="inline-flex items-center justify-center transition-colors rounded-sm outline-none size-5 text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="More information"
                onClick={() => setHintOpen((open) => !open)}
              >
                <Info className="size-4" />
              </TooltipTrigger>
              <TooltipContent className="max-w-60">
                {hint}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      <Input id={id} className="h-12 text-base" {...props} />
    </div>
  )
}

export function AuthError({ message }: { message?: string | null }) {
  return (
    <div className="flex items-center justify-center px-2 text-sm text-center min-h-10 text-destructive">
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
