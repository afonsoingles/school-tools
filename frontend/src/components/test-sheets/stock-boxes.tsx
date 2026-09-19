import { AlignJustify, Grid3x3 } from "lucide-react"

export function TestSheetStockBoxes({
  lined,
  graph,
  linedLabel,
  graphLabel,
}: {
  lined: number
  graph: number
  linedLabel: string
  graphLabel: string
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="flex flex-col gap-1 rounded-lg border border-border bg-background px-4 py-3">
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <AlignJustify className="size-3.5" />
          {linedLabel}
        </span>
        <span className="text-2xl font-semibold tabular-nums">{lined}</span>
      </div>
      <div className="flex flex-col gap-1 rounded-lg border border-border bg-background px-4 py-3">
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Grid3x3 className="size-3.5" />
          {graphLabel}
        </span>
        <span className="text-2xl font-semibold tabular-nums">{graph}</span>
      </div>
    </div>
  )
}