"use client"

import { useEffect, useMemo, useState } from "react"
import type { ReactNode } from "react"
import { toast } from "sonner"
import {
  Ban,
  CalendarDays,
  CalendarX2,
  Clock,
  Globe,
  Loader2,
  Mail,
  MailCheck,
  Pencil,
  RefreshCcw,
  Save,
  ShieldCheck,
  Trash2,
  UserCheck,
  Zap,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import { UserAvatar } from "@/components/layout/user-avatar"
import { EVALUATION_TYPE_LABELS } from "@/components/evaluations/constants"
import { SubjectIcon } from "@/components/ui/subject-icon"
import { ErrorBox } from "@/components/ui/error-box"
import { errorMessage } from "@/lib/errors"
import { WEEKDAY_NAMES } from "@/lib/date-time"
import { REASON_LABELS } from "@/components/calendar/constants"
import {
  getUserContent,
  resendVerificationEmail,
  suspendUser,
  unsuspendUser,
  updateAdminUser,
} from "@/lib/api/admin"
import type {
  AdminUserContent,
  AdminUserContentType,
  CancelledClassEvent,
  ClassEvent,
  Evaluation,
  Subject,
  User,
} from "@/types"

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

function getIanaTimezones(): string[] {
  try {
    const zones = Intl.supportedValuesOf?.("timeZone")
    if (zones && zones.length > 0) return zones
  } catch {
    // fall through
  }
  return FALLBACK_TIMEZONES
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

function formatDateTimeTz(value: string, timezone: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  try {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: timezone,
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(date)
  } catch {
    return formatISODate(value)
  }
}

function Detail({
  label,
  icon,
  children,
}: {
  label: string
  icon?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="flex items-center gap-1 text-xs tracking-wide text-muted-foreground uppercase">
        {icon}
        {label}
      </span>
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
  if (message.ok) {
    return (
      <p className="text-sm text-green-400 bg-green-500/10 border border-green-500/25 rounded-md px-3 py-2">
        {message.text}
      </p>
    )
  }
  return <ErrorBox>{message.text}</ErrorBox>
}

function SectionLoading({ label }: { label: string }) {
  return (
    <div
      className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground"
      role="status"
      aria-label={`Loading ${label}`}
    >
      <Loader2 className="size-4 animate-spin" />
      Loading {label}…
    </div>
  )
}

function SectionError({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-start gap-3">
      <ErrorBox>{error}</ErrorBox>
      <Button variant="outline" size="sm" onClick={onRetry} className="gap-1.5">
        <RefreshCcw className="size-3.5" />
        Try again
      </Button>
    </div>
  )
}

function SectionEmpty({ label }: { label: string }) {
  return <p className="text-sm text-muted-foreground">No {label}.</p>
}

function SectionBody<T extends readonly unknown[]>({
  data,
  error,
  loadingLabel,
  emptyLabel,
  onRetry,
  children,
}: {
  data: T | null
  error?: string | null
  loadingLabel: string
  emptyLabel: string
  onRetry: () => void
  children: (data: T) => ReactNode
}) {
  if (data === null) return <SectionLoading label={loadingLabel} />
  if (error) return <SectionError error={error} onRetry={onRetry} />
  if (data.length === 0) return <SectionEmpty label={emptyLabel} />
  return children(data)
}

export function UserDetails({ initial }: { initial: User }) {
  const [user, setUser] = useState<User>(initial)
  const [subjects, setSubjects] = useState<Subject[] | null>(null)
  const [classes, setClasses] = useState<ClassEvent[] | null>(null)
  const [cancellations, setCancellations] = useState<CancelledClassEvent[] | null>(null)
  const [evaluations, setEvaluations] = useState<Evaluation[] | null>(null)
  const [sectionErrors, setSectionErrors] = useState<Partial<Record<AdminUserContentType, string>>>(
    {}
  )
  const [retryKey, setRetryKey] = useState(0)

  const [editMode, setEditMode] = useState(false)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const [sendingVerification, setSendingVerification] = useState(false)
  const [verifyMessage, setVerifyMessage] = useState<{ ok: boolean; text: string } | null>(null)

  const [suspendOpen, setSuspendOpen] = useState(false)
  const [suspendReason, setSuspendReason] = useState("")
  const [suspending, setSuspending] = useState(false)
  const [suspendError, setSuspendError] = useState<string | null>(null)
  const [reactivateOpen, setReactivateOpen] = useState(false)
  const [reactivating, setReactivating] = useState(false)
  const [reactivateError, setReactivateError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    function loadSection<C extends AdminUserContentType>(
      type: C,
      setData: (value: AdminUserContent<C>) => void
    ) {
      getUserContent(user.id, type)
        .then((content) => {
          if (!cancelled) {
            setData(content)
            setSectionErrors((prev) => ({ ...prev, [type]: undefined }))
          }
        })
        .catch((err) => {
          if (!cancelled) setSectionErrors((prev) => ({ ...prev, [type]: errorMessage(err) }))
        })
    }

    loadSection("subjects", setSubjects)
    loadSection("classes", setClasses)
    loadSection("cancellations", setCancellations)
    loadSection("evaluations", setEvaluations)

    return () => {
      cancelled = true
    }
  }, [user.id, retryKey])

  const timezones = useMemo(() => getIanaTimezones(), [])

  const subjectNames = useMemo(
    () => new Map((subjects ?? []).map((subject) => [subject.id, subject.name])),
    [subjects]
  )
  const subjectIcons = useMemo(
    () => new Map((subjects ?? []).map((subject) => [subject.id, subject.icon])),
    [subjects]
  )
  const classSubjectNames = useMemo(
    () =>
      new Map(
        (classes ?? []).map((cls) => [
          cls.id,
          subjectNames.get(cls.subject_id) ?? "Unknown subject",
        ])
      ),
    [classes, subjectNames]
  )
  const classSubjectIcons = useMemo(
    () =>
      new Map((classes ?? []).map((cls) => [cls.id, subjectIcons.get(cls.subject_id) ?? ""])),
    [classes, subjectIcons]
  )

  function startEdit() {
    setDraft({
      name: user.name,
      email: user.email,
      timezone: user.timezone,
      active: user.active,
      admin: user.admin,
      superadmin: user.superadmin,
      email_verified: user.email_verified,
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
      const updated = await updateAdminUser(user.id, {
        name: draft.name,
        email: draft.email,
        timezone: draft.timezone,
        active: draft.active,
        admin: draft.admin,
        superadmin: draft.superadmin,
        email_verified: draft.email_verified,
      })
      setUser(updated)
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
      const message = await resendVerificationEmail(user.id)
      setVerifyMessage({ ok: true, text: message })
    } catch (err) {
      setVerifyMessage({ ok: false, text: errorMessage(err) })
    } finally {
      setSendingVerification(false)
    }
  }

  async function handleSuspend() {
    const reason = suspendReason.trim()
    if (!reason) return

    setSuspending(true)
    setSuspendError(null)

    try {
      const message = await suspendUser(user.id, reason)
      toast.success(message)
      setUser((prev) => ({ ...prev, active: false }))
      setSuspendReason("")
      setSuspendOpen(false)
    } catch (err) {
      setSuspendError(errorMessage(err))
    } finally {
      setSuspending(false)
    }
  }

  async function handleReactivate() {
    setReactivating(true)
    setReactivateError(null)

    try {
      const message = await unsuspendUser(user.id)
      toast.success(message)
      setUser((prev) => ({ ...prev, active: true }))
      setReactivateOpen(false)
    } catch (err) {
      setReactivateError(errorMessage(err))
    } finally {
      setReactivating(false)
    }
  }

  function retrySections() {
    setSectionErrors({})
    setRetryKey((key) => key + 1)
  }

  const roleBadge =
    user.superadmin || user.admin ? (
      <Badge className="gap-1 border-yellow-300/40 bg-yellow-300/10 text-yellow-300 [a]:hover:bg-yellow-300/10">
        <ShieldCheck className="size-3" />
        {user.superadmin ? "Superadmin" : "Admin"}
      </Badge>
    ) : null

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-muted-foreground">Account</h2>
        <Card>
          <CardHeader>
            <CardTitle>
              <span className="flex flex-wrap items-center gap-3">
                <UserAvatar user={user} size="lg" />
                <span className="flex flex-col gap-1.5">
                  <span className="flex flex-wrap items-center gap-1.5">
                    {user.name}
                    {(user.admin || user.superadmin) && (
                      <Zap
                        className="size-4 fill-current text-yellow-300"
                        aria-label={user.superadmin ? "Superadmin" : "Admin"}
                      />
                    )}
                  </span>
                  <span className="flex flex-wrap items-center gap-1.5">
                    {roleBadge}
                    <Badge variant={user.active ? "secondary" : "destructive"}>
                      {user.active ? "Active" : "Inactive"}
                    </Badge>
                    <Badge variant={user.email_verified ? "secondary" : "outline"}>
                      {user.email_verified ? "Email verified" : "Email not verified"}
                    </Badge>
                  </span>
                </span>
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {!editMode ? (
              <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                <Detail label="Email" icon={<Mail className="size-3.5" />}>
                  {user.email}
                </Detail>
                <Detail label="Timezone" icon={<Globe className="size-3.5" />}>
                  {user.timezone}
                </Detail>
                <Detail label="Created" icon={<CalendarDays className="size-3.5" />}>
                  {formatDateTimeTz(user.created_at, user.timezone)}
                </Detail>
                <Detail label="Updated" icon={<Clock className="size-3.5" />}>
                  {formatDateTimeTz(user.updated_at, user.timezone)}
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
                    onValueChange={(timezone) =>
                      setDraft({ ...draft, timezone: String(timezone) })
                    }
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
                <Button variant="outline" size="sm" onClick={startEdit} className="gap-1.5">
                  <Pencil className="size-3.5" />
                  Edit
                </Button>
              )}

              {user.active ? (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setSuspendOpen(true)}
                  className="gap-1.5"
                >
                  <Ban className="size-3.5" />
                  Suspend
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setReactivateOpen(true)}
                  className="gap-1.5"
                >
                  <UserCheck className="size-3.5" />
                  Reactivate
                </Button>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={resend}
                disabled={sendingVerification || user.email_verified}
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
        <h2 className="text-sm font-semibold text-muted-foreground">
          Subjects{subjects !== null ? ` (${subjects.length})` : ""}
        </h2>
        <SectionBody
          data={subjects}
          error={sectionErrors.subjects}
          loadingLabel="subjects"
          emptyLabel="subjects"
          onRetry={retrySections}
        >
          {(data) => (
            <div className="rounded-lg border border-border bg-background">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...data]
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((subject) => (
                      <TableRow key={subject.id}>
                        <TableCell>
                          <span className="flex items-center gap-1.5">
                            <SubjectIcon
                              icon={subject.icon}
                              className="size-3.5 shrink-0 text-muted-foreground"
                            />
                            {subject.name}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          )}
        </SectionBody>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-muted-foreground">
          Classes{classes !== null ? ` (${classes.length})` : ""}
        </h2>
        {classes === null || cancellations === null ? (
          <SectionLoading label="classes" />
        ) : sectionErrors.classes ? (
          <SectionError error={sectionErrors.classes} onRetry={retrySections} />
        ) : sectionErrors.cancellations ? (
          <SectionError error={sectionErrors.cancellations} onRetry={retrySections} />
        ) : classes.length === 0 ? (
          <SectionEmpty label="classes" />
        ) : (
          <div className="overflow-hidden rounded-lg border border-border bg-background">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subject</TableHead>
                  <TableHead>Weekday</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Cancellations</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...classes]
                  .sort(
                    (a, b) => a.weekday - b.weekday || a.start_time.localeCompare(b.start_time)
                  )
                  .map((cls) => {
                    const classCancellations = cancellations.filter(
                      (cancellation) => cancellation.class_id === cls.id
                    )
                    return (
                      <TableRow key={cls.id}>
                        <TableCell className="font-medium">
                          <span className="flex items-center gap-1.5">
                            <SubjectIcon
                              icon={subjectIcons.get(cls.subject_id) ?? ""}
                              className="size-3.5 shrink-0 text-muted-foreground"
                            />
                            {subjectNames.get(cls.subject_id) ?? "Unknown subject"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{WEEKDAY_NAMES[cls.weekday]}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {cls.start_time} – {cls.end_time}
                        </TableCell>
                        <TableCell>
                          {classCancellations.length === 0 ? (
                            <span className="text-muted-foreground">—</span>
                          ) : (
                            <ul className="flex flex-col gap-1.5">
                              {[...classCancellations]
                                .sort((a, b) => b.date.localeCompare(a.date))
                                .map((cancellation) => (
                                  <li
                                    key={cancellation.id}
                                    className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground"
                                  >
                                    <CalendarX2 className="size-3.5 shrink-0 text-red-400" />
                                    <span>{formatISODate(cancellation.date)}</span>
                                    <span className="text-muted-foreground/60">·</span>
                                    <span>
                                      {REASON_LABELS[cancellation.reason] ?? cancellation.reason}
                                    </span>
                                  </li>
                                ))}
                            </ul>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-muted-foreground">
          Evaluations{evaluations !== null ? ` (${evaluations.length})` : ""}
        </h2>
        <SectionBody
          data={evaluations}
          error={sectionErrors.evaluations}
          loadingLabel="evaluations"
          emptyLabel="evaluations"
          onRetry={retrySections}
        >
          {(data) => (
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
                  {[...data]
                    .sort((a, b) => a.date.localeCompare(b.date))
                    .map((evaluation) => (
                      <TableRow key={evaluation.id}>
                        <TableCell className="font-medium">
                          <span className="flex items-center gap-1.5">
                            <SubjectIcon
                              icon={classSubjectIcons.get(evaluation.class_id) ?? ""}
                              className="size-3.5 shrink-0 text-muted-foreground"
                            />
                            {classSubjectNames.get(evaluation.class_id) ?? "Unknown subject"}
                          </span>
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
        </SectionBody>
      </section>

      <Dialog
        open={suspendOpen}
        onOpenChange={(next) => {
          if (!next) {
            setSuspendReason("")
            setSuspendError(null)
          }
          setSuspendOpen(next)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suspend user</DialogTitle>
            <DialogDescription>
              They will be signed out and notified via email with this reason. Their data will not
              be deleted.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="suspend-reason">Reason</Label>
            <textarea
              id="suspend-reason"
              value={suspendReason}
              onChange={(event) => setSuspendReason(event.target.value)}
              placeholder="Why are you suspending this user?"
              className="h-24 w-full resize-none rounded-lg border border-input bg-transparent px-2.5 py-1 text-base outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30"
            />
          </div>

          {suspendError && <ErrorBox>{suspendError}</ErrorBox>}

          <div className="flex justify-end gap-2">
            <Button
              variant="destructive"
              onClick={handleSuspend}
              disabled={suspending || !suspendReason.trim()}
              className="gap-1.5"
            >
              {suspending && <Loader2 className="size-4 animate-spin" />}
              Suspend user
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={reactivateOpen}
        onOpenChange={(next) => {
          if (!next) {
            setReactivateError(null)
          }
          setReactivateOpen(next)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reactivate user</DialogTitle>
            <DialogDescription>
              They will regain access to their account. They will NOT be notified about this
              action.
            </DialogDescription>
          </DialogHeader>

          {reactivateError && <ErrorBox>{reactivateError}</ErrorBox>}

          <div className="flex justify-end gap-2">
            <Button
              onClick={handleReactivate}
              disabled={reactivating}
              className="gap-1.5"
            >
              {reactivating && <Loader2 className="size-4 animate-spin" />}
              Reactivate user
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}