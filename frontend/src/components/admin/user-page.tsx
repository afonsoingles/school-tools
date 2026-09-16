"use client"

import { useEffect, useMemo, useState } from "react"
import type { ReactNode } from "react"
import { toast } from "sonner"
import {
  Ban,
  CalendarDays,
  CalendarX2,
  ChevronDown,
  Clock,
  Globe,
  KeyRound,
  Loader2,
  Mail,
  MailCheck,
  Pencil,
  RefreshCcw,
  Save,
  ShieldCheck,
  ShieldOff,
  Star,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
import { StatusBadge } from "@/components/ui/status-badge"
import {
  HOMEWORK_STATUS_BADGE,
  HOMEWORK_STATUS_ICON,
  HOMEWORK_STATUS_LABELS,
  isOverdueHomework,
} from "@/components/homework/constants"
import { errorMessage } from "@/lib/errors"
import { DAY_NAMES, timeToMinutes } from "@/lib/date-time"
import { REASON_LABELS } from "@/components/calendar/constants"
import {
  getUserContent,
  promoteUser,
  resendVerificationEmail,
  suspendUser,
  unsuspendUser,
  updateAdminUser,
  adminSendPasswordReset,
} from "@/lib/api/admin"
import type { PromoteRole } from "@/lib/api/admin"
import type {
  AdminUserContent,
  AdminUserContentType,
  ClassEvent,
  Evaluation,
  Homework,
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
  email_verified: boolean
}

interface RoleAction {
  role: PromoteRole
  kind: "promote" | "demote"
  title: string
}

type FieldErrors = Partial<Record<"name" | "email" | "timezone", string>>

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

function FieldError({ message }: { message: string }) {
  return <p className="text-sm text-red-400">{message}</p>
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

export function UserDetails({
  initial,
  viewerId,
  isSuperadmin,
  viewerTimezone,
}: {
  initial: User
  viewerId: string
  isSuperadmin: boolean
  viewerTimezone: string
}) {
  const [user, setUser] = useState<User>(initial)
  const [subjects, setSubjects] = useState<Subject[] | null>(null)
  const [classes, setClasses] = useState<ClassEvent[] | null>(null)
  const [evaluations, setEvaluations] = useState<Evaluation[] | null>(null)
  const [homeworks, setHomeworks] = useState<Homework[] | null>(null)
  const [sectionErrors, setSectionErrors] = useState<Partial<Record<AdminUserContentType, string>>>(
    {}
  )
  const [retryKey, setRetryKey] = useState(0)
  const [selectedHomework, setSelectedHomework] = useState<Homework | null>(null)

  const [editMode, setEditMode] = useState(false)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
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

  const [resetOpen, setResetOpen] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [resetError, setResetError] = useState<string | null>(null)

  const [roleAction, setRoleAction] = useState<RoleAction | null>(null)
  const [roleBusy, setRoleBusy] = useState(false)
  const [roleError, setRoleError] = useState<string | null>(null)

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
    loadSection("evaluations", setEvaluations)
    loadSection("homework", setHomeworks)

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
      email_verified: user.email_verified,
    })
    setFieldErrors({})
    setSaveMessage(null)
    setEditMode(true)
  }

  function cancelEdit() {
    setDraft(null)
    setFieldErrors({})
    setSaveMessage(null)
    setEditMode(false)
  }

  function validateDraft(draft: Draft): FieldErrors {
    const errors: FieldErrors = {}
    if (draft.name.trim().length < 2) {
      errors.name = "Name must be at least 2 characters."
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email.trim())) {
      errors.email = "Enter a valid email address."
    }
    if (!draft.timezone) {
      errors.timezone = "Pick a timezone."
    }
    return errors
  }

  async function save() {
    if (!draft) return
    const errors = validateDraft(draft)
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    setSaving(true)
    setSaveMessage(null)

    try {
      const updated = await updateAdminUser(user.id, {
        name: draft.name.trim(),
        email: draft.email.trim(),
        timezone: draft.timezone,
        email_verified: draft.email_verified,
      })
      setUser(updated)
      setDraft(null)
      setFieldErrors({})
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

  async function handlePasswordReset() {
    setResetting(true)
    setResetError(null)

    try {
      const message = await adminSendPasswordReset(user.id)
      toast.success(message)
      setResetOpen(false)
    } catch (err) {
      setResetError(errorMessage(err))
    } finally {
      setResetting(false)
    }
  }

  function openRoleAction(role: PromoteRole, kind: "promote" | "demote", title: string) {
    setRoleError(null)
    setRoleAction({ role, kind, title })
  }

  async function handleRoleAction() {
    if (!roleAction) return
    setRoleBusy(true)
    setRoleError(null)

    try {
      const message = await promoteUser(user.id, roleAction.role)
      toast.success(message)
      setUser((prev) => ({
        ...prev,
        admin: roleAction.role !== "user",
        superadmin: roleAction.role === "superadmin",
      }))
      setRoleAction(null)
    } catch (err) {
      setRoleError(errorMessage(err))
    } finally {
      setRoleBusy(false)
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

  const roleLabel = user.superadmin ? "Superadmin" : user.admin ? "Admin" : "User"
  const canChangeRole = isSuperadmin && user.id !== viewerId

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
                  {formatDateTimeTz(user.created_at, viewerTimezone)}
                </Detail>
                <Detail label="Updated" icon={<Clock className="size-3.5" />}>
                  {formatDateTimeTz(user.updated_at, viewerTimezone)}
                </Detail>
              </div>
            ) : draft ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="user-name">Name</Label>
                  <Input
                    id="user-name"
                    value={draft.name}
                    aria-invalid={fieldErrors.name ? true : undefined}
                    onChange={(event) => {
                      setDraft({ ...draft, name: event.target.value })
                      setFieldErrors((prev) => ({ ...prev, name: undefined }))
                    }}
                  />
                  {fieldErrors.name && <FieldError message={fieldErrors.name} />}
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="user-email">Email</Label>
                  <Input
                    id="user-email"
                    type="email"
                    value={draft.email}
                    aria-invalid={fieldErrors.email ? true : undefined}
                    onChange={(event) => {
                      setDraft({ ...draft, email: event.target.value })
                      setFieldErrors((prev) => ({ ...prev, email: undefined }))
                    }}
                  />
                  {fieldErrors.email && <FieldError message={fieldErrors.email} />}
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="user-timezone">Timezone</Label>
                  <Select
                    value={draft.timezone}
                    onValueChange={(timezone) => {
                      setDraft({ ...draft, timezone: String(timezone) })
                      setFieldErrors((prev) => ({ ...prev, timezone: undefined }))
                    }}
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
                  {fieldErrors.timezone && <FieldError message={fieldErrors.timezone} />}
                </div>
                <BoolSelect
                  label="Email verified"
                  value={draft.email_verified}
                  onChange={(email_verified) =>
                    setDraft({ ...draft, email_verified })
                  }
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

              {canChangeRole && (
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button variant="outline" size="sm" className="gap-1.5" />
                    }
                  >
                    <ShieldCheck className="size-3.5" />
                    Role · {roleLabel}
                    <ChevronDown className="size-3.5 text-muted-foreground" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="min-w-44">
                    {!user.admin && (
                      <>
                        <DropdownMenuItem
                          className="gap-1.5"
                          onClick={() =>
                            openRoleAction("admin", "promote", "Make admin")
                          }
                        >
                          <ShieldCheck className="size-3.5 text-yellow-300" />
                          Make admin
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="gap-1.5"
                          onClick={() =>
                            openRoleAction("superadmin", "promote", "Make superadmin")
                          }
                        >
                          <Star className="size-3.5 text-yellow-300" />
                          Make superadmin
                        </DropdownMenuItem>
                      </>
                    )}
                    {user.admin && !user.superadmin && (
                      <>
                        <DropdownMenuItem
                          className="gap-1.5"
                          onClick={() =>
                            openRoleAction("superadmin", "promote", "Make superadmin")
                          }
                        >
                          <Star className="size-3.5 text-yellow-300" />
                          Make superadmin
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          variant="destructive"
                          className="gap-1.5"
                          onClick={() =>
                            openRoleAction("user", "demote", "Demote to user")
                          }
                        >
                          <ShieldOff className="size-3.5" />
                          Demote to user
                        </DropdownMenuItem>
                      </>
                    )}
                    {user.superadmin && (
                      <>
                        <DropdownMenuItem
                          className="gap-1.5"
                          onClick={() =>
                            openRoleAction("admin", "demote", "Demote to admin")
                          }
                        >
                          <ShieldCheck className="size-3.5" />
                          Demote to admin
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          className="gap-1.5"
                          onClick={() =>
                            openRoleAction("user", "demote", "Demote to user")
                          }
                        >
                          <ShieldOff className="size-3.5" />
                          Demote to user
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
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

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setResetError(null)
                  setResetOpen(true)
                }}
                className="gap-1.5"
              >
                <KeyRound className="size-3.5" />
                Send password reset
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
        {classes === null ? (
          <SectionLoading label="classes" />
        ) : sectionErrors.classes ? (
          <SectionError error={sectionErrors.classes} onRetry={retrySections} />
        ) : classes.length === 0 ? (
          <SectionEmpty label="classes" />
        ) : (
          <div className="overflow-hidden rounded-lg border border-border bg-background">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subject</TableHead>
                  <TableHead>Schedules</TableHead>
                  <TableHead>Cancellations</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...classes]
                  .sort((a, b) => {
                    const keyOf = (cls: ClassEvent) => {
                      const act = cls.schedules.filter((s) => !s.valid_until)
                      if (act.length === 0) return Number.MAX_SAFE_INTEGER
                      return act.reduce(
                        (m, s) => Math.min(m, (s.scheduled_weekday - 1) * 1024 + timeToMinutes(s.start_time)),
                        Number.MAX_SAFE_INTEGER
                      )
                    }
                    return keyOf(a) - keyOf(b)
                  })
                  .map((cls) => (
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
                        <ul className="flex flex-col gap-1">
                          {[...cls.schedules]
                            .sort((a, b) => a.scheduled_weekday - b.scheduled_weekday || a.start_time.localeCompare(b.start_time))
                            .map((s) => (
                              <li key={s.id} className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
                                <Badge variant="outline" className="shrink-0">{DAY_NAMES[s.scheduled_weekday - 1]}</Badge>
                                <span className="tabular-nums">{s.start_time} – {s.end_time}</span>
                                {s.valid_until && (
                                  <span className="text-xs">ended {formatISODate(s.valid_until)}</span>
                                )}
                              </li>
                            ))}
                        </ul>
                      </TableCell>
                      <TableCell>
                        {cls.cancellations.length === 0 ? (
                          <span className="text-muted-foreground">—</span>
                        ) : (
                          <ul className="flex flex-col gap-1.5">
                            {[...cls.cancellations]
                              .sort((a, b) => b.date.localeCompare(a.date))
                              .map((cancellation) => (
                                <li key={cancellation.id} className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
                                  <CalendarX2 className="size-3.5 shrink-0 text-red-400" />
                                  <span>{formatISODate(cancellation.date)}</span>
                                  <span className="text-muted-foreground/60">·</span>
                                  <span>{REASON_LABELS[cancellation.reason] ?? cancellation.reason}</span>
                                  {cancellation.note && <span className="text-xs">— {cancellation.note}</span>}
                                </li>
                              ))}
                          </ul>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
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

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-muted-foreground">
          Homework{homeworks !== null ? ` (${homeworks.length})` : ""}
        </h2>
        <SectionBody
          data={homeworks}
          error={sectionErrors.homework}
          loadingLabel="homework"
          emptyLabel="homework"
          onRetry={retrySections}
        >
          {(data) => (
            <div className="overflow-hidden rounded-lg border border-border bg-background">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Subject</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Due</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...data]
                    .sort(
                      (a, b) =>
                        new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
                    )
                    .map((homework) => {
                      const overdue = isOverdueHomework(homework, new Date())
                      return (
                        <TableRow
                          key={homework.id}
                          data-overdue={overdue || undefined}
                          className={overdue ? "cursor-pointer bg-red-500/5" : "cursor-pointer"}
                          onClick={() => setSelectedHomework(homework)}
                        >
                          <TableCell className="font-medium">
                            <span className="flex items-center gap-1.5">
                              <SubjectIcon
                                icon={subjectIcons.get(homework.subject_id) ?? ""}
                                className="size-3.5 shrink-0 text-muted-foreground"
                              />
                              {subjectNames.get(homework.subject_id) ?? "Unknown subject"}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="font-medium">{homework.title}</span>
                          </TableCell>
                          <TableCell>
                            <StatusBadge
                              icon={HOMEWORK_STATUS_ICON[homework.status]}
                              className={HOMEWORK_STATUS_BADGE[homework.status]}
                            >
                              {HOMEWORK_STATUS_LABELS[homework.status] ?? homework.status}
                            </StatusBadge>
                          </TableCell>
                          <TableCell>
                            <span
                              className={
                                overdue
                                  ? "font-medium text-red-400"
                                  : "text-muted-foreground"
                              }
                            >
                              {formatDateTimeTz(homework.due_date, viewerTimezone)}
                              {overdue && (
                                <span className="ml-1.5 text-xs text-red-400">· Overdue</span>
                              )}
                            </span>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                </TableBody>
              </Table>
            </div>
          )}
        </SectionBody>
      </section>

      <Dialog
        open={selectedHomework !== null}
        onOpenChange={(next) => {
          if (!next) setSelectedHomework(null)
        }}
      >
        {selectedHomework && (() => {
          const homework = selectedHomework
          const overdue = isOverdueHomework(homework, new Date())
          return (
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{homework.title}</DialogTitle>
                <DialogDescription>
                  <span className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                    <span className="flex items-center gap-1.5">
                      <SubjectIcon
                        icon={subjectIcons.get(homework.subject_id) ?? ""}
                        className="size-3.5 shrink-0 text-muted-foreground"
                      />
                      <span className="font-medium text-foreground">
                        {subjectNames.get(homework.subject_id) ?? "Unknown subject"}
                      </span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <CalendarDays className="size-3.5 text-muted-foreground" />
                      <span className={overdue ? "font-medium text-red-400" : ""}>
                        {formatDateTimeTz(homework.due_date, viewerTimezone)}
                        {overdue && (
                          <span className="ml-1.5 text-xs text-red-400">· Overdue</span>
                        )}
                      </span>
                    </span>
                    <StatusBadge
                      icon={HOMEWORK_STATUS_ICON[homework.status]}
                      className={HOMEWORK_STATUS_BADGE[homework.status]}
                    >
                      {HOMEWORK_STATUS_LABELS[homework.status] ?? homework.status}
                    </StatusBadge>
                  </span>
                </DialogDescription>
              </DialogHeader>

              <div className="h-px bg-border" />

              <div>
                <h3 className="mb-1.5 text-sm font-semibold text-muted-foreground">
                  Description
                </h3>
                <p className="max-w-xl text-sm leading-relaxed whitespace-pre-wrap text-foreground">
                  {homework.description || "No description provided."}
                </p>
              </div>
            </DialogContent>
          )
        })()}
      </Dialog>

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
              className="h-24 w-full resize-none rounded-lg border border-input bg-transparent px-2.5 py-1 text-base outline-hidden transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30"
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

      <Dialog
        open={resetOpen}
        onOpenChange={(next) => {
          if (!next) {
            setResetError(null)
          }
          setResetOpen(next)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send password reset</DialogTitle>
            <DialogDescription>
              A password reset link will be sent to <span className="font-medium">{user.email}</span>.
              They will be able to set a new password.
            </DialogDescription>
          </DialogHeader>

          {resetError && <ErrorBox>{resetError}</ErrorBox>}

          <div className="flex justify-end gap-2">
            <Button
              onClick={handlePasswordReset}
              disabled={resetting}
              className="gap-1.5"
            >
              {resetting && <Loader2 className="size-4 animate-spin" />}
              Send reset link
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={roleAction !== null}
        onOpenChange={(next) => {
          if (!next) {
            setRoleError(null)
            setRoleAction(null)
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{roleAction?.title ?? ""}</DialogTitle>
            <DialogDescription>
              {roleAction?.kind === "promote" ? (
                roleAction.role === "superadmin" ? (
                  <>
                    This grants <span className="font-medium">{user.name}</span> full superadmin
                    powers, including the ability to promote or demote other users.
                  </>
                ) : (
                  <>
                    This grants <span className="font-medium">{user.name}</span> access to the
                    admin panel.
                  </>
                )
              ) : roleAction?.role === "admin" ? (
                <>
                  This removes superadmin powers from{" "}
                  <span className="font-medium">{user.name}</span>. They keep admin access.
                </>
              ) : (
                <>
                  This removes all admin powers from{" "}
                  <span className="font-medium">{user.name}</span> and they become a regular
                  user.
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {roleError && <ErrorBox>{roleError}</ErrorBox>}

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setRoleAction(null)} disabled={roleBusy}>
              Cancel
            </Button>
            <Button
              variant={roleAction?.kind === "demote" ? "destructive" : "default"}
              onClick={handleRoleAction}
              disabled={roleBusy}
              className="gap-1.5"
            >
              {roleBusy && <Loader2 className="size-4 animate-spin" />}
              {roleAction?.title ?? ""}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}