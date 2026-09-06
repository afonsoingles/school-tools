import { cn } from "@/lib/utils"

interface PageHeaderProps {
  title: string
  subtitle: string
  className?: string
}

export function PageHeader({ title, subtitle, className }: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-1 px-4 py-4 md:px-8 md:py-6", className)}>
      <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">{title}</h1>
      <p className="text-sm text-muted-foreground md:text-md">{subtitle}</p>
    </div>
  )
}