"use client"

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react"
import {
  Activity,
  BookOpen,
  CalendarDays,
  CalendarOff,
  Check,
  ClipboardList,
  Clock,
  Database,
  GraduationCap,
  Loader2,
  MailCheck,
  MailX,
  RefreshCcw,
  Rss,
  TrendingUp,
  UserCheck,
  UserX,
  Users,
  type LucideIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { ErrorBox } from "@/components/ui/error-box"
import { GatedTooltip } from "@/components/admin/gated-tooltip"
import { errorMessage } from "@/lib/errors"
import { cn } from "@/lib/utils"
import {
  adminRefreshStats,
  getAdoptionStats,
  getFunctionalityStats,
  getUserStats,
} from "@/lib/api/admin"
import type { AdoptionStats, FunctionalityStats, UserStats } from "@/types"

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

function fetchAllStats() {
  return Promise.all([getUserStats(), getAdoptionStats(), getFunctionalityStats()])
}

type ContentCounts = Pick<
  AdoptionStats,
  "homework" | "evaluations" | "subjects" | "classes" | "cancellations"
>

function contentNodes(
  stats: ContentCounts,
  homeworkLabel: string,
  extra: ReactNode[] = []
): ReactNode[] {
  return [
    <Stat key="homework" icon={ClipboardList} label={homeworkLabel} value={stats.homework} />,
    <Stat key="evals" icon={GraduationCap} label="Evaluations" value={stats.evaluations} />,
    <Stat key="subjects" icon={BookOpen} label="Subjects" value={stats.subjects} />,
    <Stat key="classes" icon={CalendarDays} label="Classes" value={stats.classes} />,
    <Stat key="cancels" icon={CalendarOff} label="Cancellations" value={stats.cancellations} />,
    ...extra,
  ]
}

function formatComputedAt(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d)
}

function Stat({
  icon: Icon,
  label,
  value,
  strong = false,
}: {
  icon: LucideIcon
  label: string
  value: number
  strong?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-muted/40 px-3 py-2">
      <span className="flex min-w-0 items-center gap-2">
        <Icon className="size-3.5 shrink-0 text-muted-foreground" />
        <span className="truncate text-sm text-muted-foreground">{label}</span>
      </span>
      <span
        className={cn(
          "font-mono text-sm tabular-nums",
          strong ? "font-semibold text-foreground" : "font-medium text-foreground"
        )}
      >
        {value.toLocaleString()}
      </span>
    </div>
  )
}

interface StatSectionProps {
  icon: LucideIcon
  title: string
  description: string
  items: ReactNode[]
}

function StatSection({ icon: Icon, title, description, items }: StatSectionProps) {
  const mid = Math.ceil(items.length / 2)
  const left = items.slice(0, mid)
  const right = items.slice(mid)

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Icon className="size-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      <p className="text-xs text-muted-foreground">{description}</p>
      <div className="grid grid-cols-1 gap-2 pt-1 sm:grid-cols-2">
        <div className="flex flex-col gap-2">{left}</div>
        <div className="flex flex-col gap-2">{right}</div>
      </div>
    </section>
  )
}

export function StatsOverview({ isSuperadmin }: { isSuperadmin: boolean }) {
  const [userStats, setUserStats] = useState<UserStats | null>(null)
  const [adoptionStats, setAdoptionStats] = useState<AdoptionStats | null>(null)
  const [functionalityStats, setFunctionalityStats] = useState<FunctionalityStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [justUpdated, setJustUpdated] = useState(false)
  const justUpdatedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const applyStats = useCallback(
    (u: UserStats, a: AdoptionStats, f: FunctionalityStats) => {
      setUserStats(u)
      setAdoptionStats(a)
      setFunctionalityStats(f)
    },
    []
  )

  const loadAll = useCallback(() => {
    return fetchAllStats()
      .then(([u, a, f]) => applyStats(u, a, f))
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false))
  }, [applyStats])

  useEffect(() => {
    loadAll()

    return () => {
      if (justUpdatedTimer.current) clearTimeout(justUpdatedTimer.current)
    }
  }, [loadAll])

  function retryLoad() {
    setError(null)
    setLoading(true)
    loadAll()
  }

  function maxComputedAt(stats: Array<UserStats | AdoptionStats | FunctionalityStats | null>): number {
    return stats
      .map((s) => (s ? new Date(s.computed_at).getTime() : Number.NaN))
      .filter((t) => !Number.isNaN(t))
      .reduce((max, t) => Math.max(max, t), 0)
  }

  const currentStats: Array<UserStats | AdoptionStats | FunctionalityStats | null> = [
    userStats,
    adoptionStats,
    functionalityStats,
  ]

  async function handleUpdate() {
    if (refreshing || justUpdated) return
    if (!userStats && !adoptionStats && !functionalityStats) return

    const prevMax = maxComputedAt(currentStats)
    setError(null)
    setRefreshing(true)

    try {
      await adminRefreshStats()

      for (let attempt = 0; attempt < 60; attempt++) {
        await sleep(1000)
        try {
          const [u, a, f] = await fetchAllStats()
          if (maxComputedAt([u, a, f]) > prevMax) {
            applyStats(u, a, f)
            break
          }
        } catch {}
      }
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setRefreshing(false)
      setJustUpdated(true)
      if (justUpdatedTimer.current) clearTimeout(justUpdatedTimer.current)
      justUpdatedTimer.current = setTimeout(() => setJustUpdated(false), 3000)
    }
  }

  const computedAtMs = maxComputedAt(currentStats)
  const asOf = computedAtMs > 0 ? formatComputedAt(new Date(computedAtMs).toISOString()) : null

  const hasData = userStats !== null || adoptionStats !== null || functionalityStats !== null
  const firstLoad = loading && !hasData

  const userNodes: ReactNode[] = userStats
    ? [
        <Stat key="total" icon={Users} label="Total users" value={userStats.total} strong />,
        <Stat key="verified" icon={MailCheck} label="Verified" value={userStats.verified} />,
        <Stat key="unverified" icon={MailX} label="Unverified" value={userStats.unverified} />,
        <Stat key="active" icon={UserCheck} label="Active" value={userStats.active} />,
        <Stat key="inactive" icon={UserX} label="Inactive" value={userStats.inactive} />,
        <Stat key="new7d" icon={TrendingUp} label="New (7d)" value={userStats.new_7d} />,
        <Stat key="new30d" icon={TrendingUp} label="New (30d)" value={userStats.new_30d} />,
      ]
    : []

  const adoptionNodes: ReactNode[] = adoptionStats
    ? contentNodes(adoptionStats, "Homework", [
        <Stat key="ics" icon={Rss} label="ICS feeds enabled" value={adoptionStats.ics} />,
      ])
    : []

  const functionalityNodes: ReactNode[] = functionalityStats
    ? contentNodes(functionalityStats, "Homeworks")
    : []

  if (firstLoad) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="size-4 animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex max-w-xl flex-1 flex-col gap-6">
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        {asOf ? (
          <>
            <Clock className="size-3.5" />
            <span>Updated at {asOf}</span>
          </>
        ) : (
          <span>Couldn&apos;t update, sorry.</span>
        )}

        {isSuperadmin ? (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleUpdate}
            disabled={refreshing || justUpdated}
            className="hover:bg-foreground/10!"
            aria-label="Update statistics"
          >
            {refreshing ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : justUpdated ? (
              <Check className="size-3.5 text-green-500" />
            ) : (
              <RefreshCcw className="size-3.5" />
            )}
          </Button>
        ) : (
          <GatedTooltip label="You don&apos;t look like a superadmin!">
            <Button
              variant="ghost"
              size="icon-sm"
              disabled
              aria-disabled
              className="pointer-events-none opacity-50"
            >
              <RefreshCcw className="size-3.5" />
            </Button>
          </GatedTooltip>
        )}
      </div>

          {error && <ErrorBox>{error}</ErrorBox>}

          {!hasData ? (
            <div className="flex flex-col gap-2">
              <ErrorBox>The statistics could not be loaded.</ErrorBox>
              <Button variant="outline" size="sm" onClick={retryLoad} className="w-fit gap-1.5">
                <RefreshCcw className="size-3.5" />
                Retry
              </Button>
            </div>
          ) : (
            <>
              <StatSection icon={Users} title="Users" description="Account information" items={userNodes} />
              <StatSection
            icon={Activity}
            title="Adoption"
            description="Users with at least one record"
            items={adoptionNodes}
          />
              <StatSection
            icon={Database}
            title="Content volume"
            description="Total instances of each type of content"
            items={functionalityNodes}
          />
            </>
          )}
    </div>
  )
}