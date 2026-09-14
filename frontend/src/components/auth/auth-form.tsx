"use client"

import * as React from "react"
import { Eye, EyeOff, Info, Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

type AuthCardProps = {
  title: string
  description?: string
  footer?: React.ReactNode
  onSubmit?: React.FormEventHandler<HTMLFormElement>
  children: React.ReactNode
}

export function AuthCard({ title, description, footer, onSubmit, children }: AuthCardProps) {
  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="gap-1.5 justify-items-center text-center">
        <CardTitle className="text-2xl font-semibold tracking-tight">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        {onSubmit ? (
          <form onSubmit={onSubmit} className="flex flex-col gap-3">
            {children}
          </form>
        ) : (
          children
        )}
      </CardContent>
      {footer && (
        <CardFooter className="justify-center py-3.5">
          <p className="text-sm text-center text-muted-foreground">{footer}</p>
        </CardFooter>
      )}
    </Card>
  )
}

type AuthFieldProps = { label: string; hint?: string } & React.ComponentProps<"input">

export function AuthField({ id, label, hint, type = "text", ...props }: AuthFieldProps) {
  const [hintOpen, setHintOpen] = React.useState(false)
  const [visible, setVisible] = React.useState(false)
  const isPassword = type === "password"

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
      <div className="relative">
        <Input
          id={id}
          type={isPassword && visible ? "text" : type}
          className={cn("h-11 text-base", isPassword && "pr-11")}
          {...props}
        />
        {isPassword && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="absolute top-1/2 -translate-y-1/2 right-1.5 text-muted-foreground hover:text-foreground"
            aria-label={visible ? "Hide password" : "Show password"}
            onClick={() => setVisible((v) => !v)}
          >
            {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </Button>
        )}
      </div>
    </div>
  )
}

export function AuthSubmit({ loading, children }: { loading: boolean; children: React.ReactNode }) {
  return (
    <Button type="submit" size="lg" className="h-11 text-base" disabled={loading}>
      {loading && <Loader2 className="size-4 animate-spin" />}
      {children}
    </Button>
  )
}