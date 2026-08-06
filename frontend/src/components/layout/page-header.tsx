interface PageHeaderProps {
  title: string
  subtitle: string
}

export function PageHeader({ title, subtitle }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-1 px-8 py-6 ">
      <h1 className="text-3xl font-semibold tracking-tight text-foreground">{title}</h1>
      <p className="text-md text-muted-foreground">{subtitle}</p>
    </div>
  )
}