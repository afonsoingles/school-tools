"use client"

import { useMemo, useState } from "react"
import type { ReactNode } from "react"
import {
  Loader2,
  MailCheck,
  Pencil,
  Save,
  ShieldCheck,
  Trash2,
  Zap,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { EVALUATION_TYPE_LABELS } from "@/components/evaluations/constants"
import { ApiError } from "@/lib/api/client"
import { resendVerificationEmail, updateAdminUser } from "@/lib/api/admin"
import type { AdminUserDetail, CancelledClassEvent } from "@/types"

const WEEKDAY_NAMES = ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
const CANCELLATION_REASON_LABELS: Record<string, string> = {
  break: "Break",
  public_holiday: "Public holiday",
  other: "Other",
}
const FALLBACK_TIMEZONES = [
  "Etc/Universal",
  "UTC",
  "Europe/Lisbon",
  "Europe/London",
  "Europe/Paris",
  "Europe/Madrid",
  "America/New_York",
  "America/Sao_Paulo",
  "Asia/Tokyo",
  "Asia/Kolkata",
]

interface Draft {
  name: string
  email: string
  timezone: string
  active: boolean
  admin: boolean
  superadmin: boolean
  email_verified: boolean
}

function errorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    const body = err.body as { message?: string } | null
    return body?.message ?? "Something went wrong. Please try again."
  }
  return "Something went wrong. Please try again."
}

function getIanaTimezones(): string[] {
  try {
    const zones = Intl.supportedValuesOf?.("timeZone")
    if (zones && zones.length > 0) return zones
  } catch {
    // fall through
  }
  return FALLBACK_TIMEZONES
}

function formatDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
}

function formatISODate(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-")
    const date = new Date(Number(year), Number(month) - 1, Number(day))
    return date.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
}

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs tracking-wide text-muted-foreground uppercase">{label}</span>
      <span className="text-sm">{children}</span>
    </div>
  )
}

function BoolSelect({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string
  value: boolean
  onChange: (value: boolean) => void
  disabled?: boolean
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      <Select value={value ? "true" : "false"} onValueChange={(next) => onChange(String(next) === "true")}>
        <SelectTrigger disabled={disabled}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="true">Yes</SelectItem>
          <SelectItem value="false">No</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}

function StatusMessage({
  message,
}: {
  message: { ok: boolean; text: string } | null
}) {
  if (!message) return null
  return (
    <p
      className={
        message.ok
          ? "text-sm text-green-400 bg-green-500/10 border border-green-500/25 rounded-md px-3 py-2"
          : "text-sm text-red-400 bg-red-500/10 border border-red-500/25 rounded-md px-3 py-2"
      }
    >
      {message.text}
    </p>
  )
}

function CancellationsList({ cancellations }: { cancellations: CancelledClassEvent[] }) {
  if (cancellations.length === 0) {
    return <p className="text-sm text-muted-foreground">No cancellations for this class.</p>
  }
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs tracking-wide text-muted-foreground uppercase">Cancellations</span>
      <ul className="flex flex-col gap-1">
        {cancellations.map((cancellation) => (
          <li
            key={cancellation.id}
            className="flex flex-wrap items-center gap-2 text-sm"
          >
            <span>{formatISODate(cancellation.date)}</span>
            <span className="text-muted-foreground">
              — {CANCELLATION_REASON_LABELS[cancellation.reason] ?? cancellation.reason}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function UserDetails({ initial }: { initial: AdminUserDetail }) {
  const [detail, setDetail] = useState<AdminUserDetail>(initial)
  const [editMode, setEditMode] = useState(false)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const [sendingVerification, setSendingVerification] = useState(false)
  const [verifyMessage, setVerifyMessage] = useState<{ ok: boolean; text: string } | null>(null)

  const timezones = useMemo(() => getIanaTimezones(), [])

  const subjectNames = useMemo(() => {
    const map = new Map<string, string>()
    detail.subjects.forEach((subject) => map.set(subject.id, subject.name))
    return map
  }, [detail.subjects])

  const evaluationSubjects = useMemo(() => {
    const map = new Map<string, string>()
    detail.classes.forEach((cls) => map.set(cls.id, subjectNames.get(cls.subject_id) ?? ""))
    return map
  }, [detail.classes, subjectNames])

  function startEdit() {
    setDraft({
      name: detail.name,
      email: detail.email,
      timezone: detail.timezone,
      active: detail.active,
      admin: detail.admin,
      superadmin: detail.superadmin,
      email_verified: detail.email_verified,
    })
    setSaveMessage(null)
    setEditMode(true)
  }

  function cancelEdit() {
    setDraft(null)
    setSaveMessage(null)
    setEditMode(false)
  }

  async function save() {
    if (!draft) return
    setSaving(true)
    setSaveMessage(null)

    try {
      const user = await updateAdminUser(detail.id, {
        name: draft.name,
        email: draft.email,
        timezone: draft.timezone,
        active: draft.active,
        admin: draft.admin,
        superadmin: draft.superadmin,
        email_verified: draft.email_verified,
      })
      setDetail((prev) => ({ ...prev, ...user }))
      setDraft(null)
      setEditMode(false)
      setSaveMessage({ ok: true, text: "User updated." })
    } catch (err) {
      setSaveMessage({ ok: false, text: errorMessage(err) })
    } finally {
      setSaving(false)
    }
  }

  async function resend() {
    setSendingVerification(true)
    setVerifyMessage(null)

    try {
      const message = await resendVerificationEmail(detail.id)
      setVerifyMessage({ ok: true, text: message })
    } catch (err) {
      setVerifyMessage({ ok: false, text: errorMessage(err) })
    } finally {
      setSendingVerification(false)
    }
  }

  const roleBadge =
    detail.superadmin || detail.admin ? (
      <Badge className="gap-1 border-yellow-300/40 bg-yellow-300/10 text-yellow-300 [a]:hover:bg-yellow-300/10">
        <ShieldCheck className="size-3" />
        {detail.superadmin ? "Superadmin" : "Admin"}
      </Badge>
    ) : (
      <Badge variant="outline">User</Badge>
    )

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-muted-foreground">User data</h2>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {detail.name}
              {(detail.admin || detail.superadmin) && (
                <Zap
                  className="size-4 fill-current text-yellow-300"
                  aria-label={detail.superadmin ? "Superadmin" : "Admin"}
                />
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {!editMode ? (
              <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                <Detail label="Email">{detail.email}</Detail>
                <Detail label="Timezone">{detail.timezone}</Detail>
                <Detail label="Created">{formatDate(detail.created_at)}</Detail>
                <Detail label="Updated">{formatDate(detail.updated_at)}</Detail>
                <Detail label="Role">
                  <span className="flex flex-wrap items-center gap-1.5">
                    {roleBadge}
                    <Badge variant={detail.active ? "secondary" : "destructive"}>
                      {detail.active ? "Active" : "Inactive"}
                    </Badge>
                    <Badge variant={detail.email_verified ? "secondary" : "outline"}>
                      {detail.email_verified ? "Email verified" : "Email not verified"}
                    </Badge>
                  </span>
                </Detail>
              </div>
            ) : draft ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="user-name">Name</Label>
                  <Input
                    id="user-name"
                    value={draft.name}
                    onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="user-email">Email</Label>
                  <Input
                    id="user-email"
                    type="email"
                    value={draft.email}
                    onChange={(event) => setDraft({ ...draft, email: event.target.value })}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="user-timezone">Timezone</Label>
                  <Select
                    value={draft.timezone}
                    onValueChange={(timezone) => setDraft({ ...draft, timezone: String(timezone) })}
                  >
                    <SelectTrigger id="user-timezone">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {timezones.map((timezone) => (
                        <SelectItem key={timezone} value={timezone}>
                          {timezone}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col justify-end gap-1.5">
                  <Label>Flags</Label>
                  <span className="flex flex-wrap items-center gap-2">
                    <BoolSelect
                      label="Admin"
                      value={draft.admin}
                      onChange={(admin) => setDraft({ ...draft, admin })}
                    />
                    <BoolSelect
                      label="Superadmin"
                      value={draft.superadmin}
                      onChange={(superadmin) => setDraft({ ...draft, superadmin })}
                    />
                  </span>
                </div>
                <BoolSelect
                  label="Active"
                  value={draft.active}
                  onChange={(active) => setDraft({ ...draft, active })}
                />
                <BoolSelect
                  label="Email verified"
                  value={draft.email_verified}
                  onChange={(email_verified) => setDraft({ ...draft, email_verified })}
                />
              </div>
            ) : null}

            <StatusMessage message={saveMessage} />

            <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
              {editMode ? (
                <>
                  <Button onClick={save} disabled={saving} className="gap-1.5">
                    {saving ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Save className="size-4" />
                    )}
                    Save changes
                  </Button>
                  <Button variant="ghost" onClick={cancelEdit} disabled={saving}>
                    Cancel
                  </Button>
                </>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={startEdit}
                  className="gap-1.5"
                >
                  <Pencil className="size-3.5" />
                  Edit
                </Button>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={resend}
                disabled={sendingVerification || detail.email_verified}
                className="gap-1.5"
              >
                {sendingVerification ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <MailCheck className="size-3.5" />
                )}
                Resend verification email
              </Button>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button variant="outline" size="sm" disabled className="gap-1.5">
                        <Trash2 className="size-3.5" />
                        Delete user
                      </Button>
                    }
                  />
                  <TooltipContent>Not yet available</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            <StatusMessage message={verifyMessage} />
          </CardContent>
        </Card>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-muted-foreground">Subjects</h2>
        {detail.subjects.length === 0 ? (
          <Card>
            <CardContent className="py-4 text-sm text-muted-foreground">No subjects.</CardContent>
          </Card>
        ) : (
          <div className="rounded-lg border border-border bg-background">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...detail.subjects]
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((subject) => (
                    <TableRow key={subject.id}>
                      <TableCell>{subject.name}</TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-muted-foreground">Classes</h2>
        {detail.classes.length === 0 ? (
          <Card>
            <CardContent className="py-4 text-sm text-muted-foreground">No classes.</CardContent>
          </Card>
        ) : (
          detail.classes.map((cls) => (
            <Card key={cls.id}>
              <CardContent className="flex flex-col gap-3 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium">
                    {subjectNames.get(cls.subject_id) ?? "Unknown subject"}
                  </span>
                  <Badge variant="outline">{WEEKDAY_NAMES[cls.weekday]}</Badge>
                  <span className="text-sm text-muted-foreground">{cls.start_time}</span>
                </div>
                <CancellationsList
                  cancellations={detail.cancelled_classes.filter(
                    (cancellation) => cancellation.class_id === cls.id
                  )}
                />
              </CardContent>
            </Card>
          ))
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-muted-foreground">Evaluations</h2>
        {detail.evaluations.length === 0 ? (
          <Card>
            <CardContent className="py-4 text-sm text-muted-foreground">
              No evaluations.
            </CardContent>
          </Card>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border bg-background">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subject</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
<TableBody>
                {[...detail.evaluations]
                  .sort((a, b) => a.date.localeCompare(b.date))
                  .map((evaluation) => (
                    <TableRow key={evaluation.id}>
                      <TableCell className="font-medium">
                        {evaluationSubjects.get(evaluation.class_id) ?? "Unknown subject"}
                      </TableCell>
                      <TableCell>
                        {EVALUATION_TYPE_LABELS[evaluation.type] ?? evaluation.type}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatISODate(evaluation.date)}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </div>
  )
}