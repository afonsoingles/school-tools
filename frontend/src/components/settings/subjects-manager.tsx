"use client"

import { useEffect, useState } from "react"
import { Check, Loader2, Pencil, Plus, Trash2, X } from "lucide-react"
import { toast } from "sonner"
import { useTranslations } from "next-intl"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ApiError } from "@/lib/api/client"
import { cn } from "@/lib/utils"
import { ErrorBox } from "@/components/ui/error-box"
import { LoadingState } from "@/components/ui/loading"
import { errorMessage } from "@/lib/errors"
import {
  createSubject,
  deleteSubject,
  getSubjects,
  renameSubject,
  updateSubjectColor,
  updateSubjectIcon,
} from "@/lib/api/settings"
import {
  DEFAULT_SUBJECT_ICON,
  LEGACY_ICON_ALIASES,
  SUBJECT_ICONS,
  getSubjectIcons,
} from "@/lib/icons"
import {
  DEFAULT_SUBJECT_COLOR,
  SUBJECT_COLORS,
  getSubjectSwatchClass,
} from "@/lib/subjects"
import type { Subject } from "@/types"

export function SubjectsManager() {
  const t = useTranslations("settings.subjects")
  const tCommon = useTranslations("common")
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [createOpen, setCreateOpen] = useState(false)
  const [name, setName] = useState("")
  const [createIcon, setCreateIcon] = useState(DEFAULT_SUBJECT_ICON)
  const [createColor, setCreateColor] = useState(DEFAULT_SUBJECT_COLOR)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState("")
  const [editIcon, setEditIcon] = useState(DEFAULT_SUBJECT_ICON)
  const [editColor, setEditColor] = useState(DEFAULT_SUBJECT_COLOR)
  const [savingId, setSavingId] = useState<string | null>(null)

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Subject | null>(null)
  const [deletingBusy, setDeletingBusy] = useState(false)

  useEffect(() => {
    getSubjects()
      .then(setSubjects)
      .catch((err) => setLoadError(errorMessage(err)))
      .finally(() => setLoading(false))
  }, [])

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    setCreating(true)

    try {
      const subject = await createSubject(name.trim(), createIcon, createColor)
      setSubjects((prev) => [...prev, subject])
      setName("")
      setCreateIcon(DEFAULT_SUBJECT_ICON)
      setCreateColor(DEFAULT_SUBJECT_COLOR)
      setCreateOpen(false)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setCreating(false)
    }
  }

  function startEditing(subject: Subject) {
    setEditingId(subject.id)
    setEditValue(subject.name)
    setEditIcon(subject.icon)
    setEditColor(subject.color ?? DEFAULT_SUBJECT_COLOR)
  }

  function stopEditing() {
    setEditingId(null)
    setEditValue("")
  }

  async function handleSave(subject: Subject) {
    const trimmed = editValue.trim()
    if (
      !trimmed ||
      (trimmed === subject.name && editIcon === subject.icon && editColor === subject.color)
    ) {
      stopEditing()
      return
    }

    setSavingId(subject.id)

    try {
      let updated = subject
      if (trimmed && trimmed !== subject.name) {
        updated = await renameSubject(subject.id, trimmed)
      }
      if (editIcon !== subject.icon) {
        updated = await updateSubjectIcon(subject.id, editIcon)
      }
      if (editColor !== subject.color) {
        updated = await updateSubjectColor(subject.id, editColor)
      }
      setSubjects((prev) => prev.map((s) => (s.id === updated.id ? updated : s)))
      stopEditing()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSavingId(null)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return

    setDeletingBusy(true)

    try {
      await deleteSubject(deleteTarget.id)
      setSubjects((prev) => prev.filter((s) => s.id !== deleteTarget.id))
      setDeleteOpen(false)
    } catch (err) {
      const code =
        err instanceof ApiError && (err.body as { code?: string } | null)?.code

      if (code === "subject_in_use") {
        setDeleteOpen(false)
        toast.error(t("deleteDialog.inUseError", { name: deleteTarget.name }))
      } else {
        setError(errorMessage(err))
      }
    } finally {
      setDeletingBusy(false)
    }
  }

  if (loading) {
    return (
      <LoadingState />
    )
  }

  if (loadError) {
    return (
      <ErrorBox>{loadError}</ErrorBox>
    )
  }

  if (subjects.length === 0) {
    return (
      <>
        <div className="flex flex-col items-center justify-center gap-3 py-24 text-center rounded-lg">
          <p className="text-sm text-muted-foreground">{t("emptyState")}</p>
          <Button onClick={() => setCreateOpen(true)} className="gap-1.5">
            <Plus className="size-4" />
            {t("createOne")}
          </Button>
        </div>

        <CreateSubjectDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          name={name}
          onNameChange={setName}
          icon={createIcon}
          onIconChange={setCreateIcon}
          color={createColor}
          onColorChange={setCreateColor}
          creating={creating}
          error={error}
          onErrorChange={setError}
          onSubmit={handleCreate}
        />
      </>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-1.5">
          <Plus className="size-3.5" />
          {t("newSubject")}
        </Button>
      </div>

      <div className="border rounded-lg border-border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("table.name")}</TableHead>
              <TableHead className="w-24 text-right">{t("table.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...subjects]
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((subject) => (
                <TableRow key={subject.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {editingId === subject.id ? (
                        <>
                          <IconPicker
                            value={editIcon}
                            onChange={setEditIcon}
                            disabled={savingId === subject.id}
                          />
                          <ColorPicker
                            value={editColor}
                            onChange={setEditColor}
                            disabled={savingId === subject.id}
                          />
                        </>
                      ) : (
                        <>
                          <ColorSwatch color={subject.color} />
                          <IconButton icon={subject.icon} />
                        </>
                      )}
                      {editingId === subject.id ? (
                        <Input
                          autoFocus
                          value={editValue}
                          onChange={(event) => setEditValue(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") handleSave(subject)
                            if (event.key === "Escape") stopEditing()
                          }}
                          maxLength={50}
                          className="max-w-xs rounded-sm h-7"
                        />
                      ) : (
                        <span>{subject.name}</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex items-center gap-1">
                      {editingId === subject.id ? (
                        <>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => handleSave(subject)}
                            disabled={savingId === subject.id}
                            className="hover:bg-foreground/10!"
                            aria-label={t("ariaLabel.saveChanges", { name: subject.name })}
                          >
                            {savingId === subject.id ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              <Check className="size-3.5" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={stopEditing}
                            disabled={savingId === subject.id}
                            className="hover:bg-foreground/10!"
                            aria-label={t("ariaLabel.cancelEdit")}
                          >
                            <X className="size-3.5" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => startEditing(subject)}
                            className="hover:bg-foreground/10!"
                            aria-label={t("ariaLabel.rename", { name: subject.name })}
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="icon-sm"
                            onClick={() => {
                              setError(null)
                              setDeleteTarget(subject)
                              setDeleteOpen(true)
                            }}
                            aria-label={t("ariaLabel.delete", { name: subject.name })}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>

      {error && (
        <ErrorBox>{error}</ErrorBox>
      )}

      <CreateSubjectDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        name={name}
        onNameChange={setName}
        icon={createIcon}
        onIconChange={setCreateIcon}
        color={createColor}
        onColorChange={setCreateColor}
        creating={creating}
        error={error}
        onErrorChange={setError}
        onSubmit={handleCreate}
      />

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("deleteDialog.title", { name: deleteTarget?.name ?? "" })}</DialogTitle>
            <DialogDescription>
              {t("deleteDialog.description")}
            </DialogDescription>
          </DialogHeader>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deletingBusy}
              className="gap-1.5"
            >
              {deletingBusy && <Loader2 className="size-4 animate-spin" />}
              {!deletingBusy && <Trash2 className="size-4" />}
              {tCommon("actions.delete")}
            </Button>
          
        </DialogContent>
      </Dialog>
    </div>
  )
}

interface CreateSubjectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  name: string
  onNameChange: (name: string) => void
  icon: string
  onIconChange: (icon: string) => void
  color: string
  onColorChange: (color: string) => void
  creating: boolean
  error: string | null
  onErrorChange: (error: string | null) => void
  onSubmit: (event: React.FormEvent) => void
}

function CreateSubjectDialog({
  open,
  onOpenChange,
  name,
  onNameChange,
  icon,
  onIconChange,
  color,
  onColorChange,
  creating,
  error,
  onErrorChange,
  onSubmit,
}: CreateSubjectDialogProps) {
  const t = useTranslations("settings.subjects")
  const tCommon = useTranslations("common")

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onErrorChange(null)
        onOpenChange(next)
      }}
    >
      <DialogContent>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>{t("createDialog.title")}</DialogTitle>
            <DialogDescription>{t("createDialog.description")}</DialogDescription>
          </DialogHeader>

          <Input
            autoFocus
            value={name}
            onChange={(event) => onNameChange(event.target.value)}
            placeholder={t("createDialog.placeholder")}
            maxLength={50}
            required
            minLength={3}
          />

          <div className="flex items-center gap-6">
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium">{t("createDialog.iconLabel")}</span>
              <IconPicker value={icon} onChange={onIconChange} />
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium">{t("createDialog.colorLabel")}</span>
              <ColorPicker value={color} onChange={onColorChange} />
            </div>
          </div>

          {error && (
            <ErrorBox>{error}</ErrorBox>
          )}

          <Button type="submit" disabled={creating || name.trim().length < 3} className="gap-1.5">
            {creating && <Loader2 className="size-4 animate-spin" />}
            {tCommon("actions.create")}
          </Button>

        </form>
      </DialogContent>
    </Dialog>
  )
}

function SubjectIcon({ icon, className }: { icon: string; className?: string }) {
  const Icon = SUBJECT_ICONS[LEGACY_ICON_ALIASES[icon] ?? icon] ?? SUBJECT_ICONS[DEFAULT_SUBJECT_ICON]
  return <Icon className={className} />
}

function IconButton({ icon, className }: { icon: string; className?: string }) {
  return <SubjectIcon icon={icon} className={cn("size-4 shrink-0 text-muted-foreground", className)} />
}

function ColorSwatch({ color, className }: { color?: string; className?: string }) {
  return <span className={cn("size-3 rounded-full shrink-0", getSubjectSwatchClass(color), className)} />
}

function ColorPicker({
  value,
  onChange,
  disabled,
}: {
  value: string
  onChange: (color: string) => void
  disabled?: boolean
}) {
  const t = useTranslations("settings.subjects")
  const [open, setOpen] = useState(false)

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={disabled}
            className="hover:bg-foreground/10!"
            aria-label={t("ariaLabel.chooseColor")}
          />
        }
      >
        <ColorSwatch color={value} className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-fit">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{t("colorDropdownLabel")}</DropdownMenuLabel>
          <div className="grid grid-cols-4 gap-3 p-2.5">
            {SUBJECT_COLORS.map((c) => (
              <Button
                key={c.name}
                variant="ghost"
                onClick={() => {
                  onChange(c.name)
                  setOpen(false)
                }}
                className={cn(
                  "size-8 p-0! rounded-lg",
                  c.name === value ? "bg-foreground/10!" : "hover:bg-foreground/10!"
                )}
                aria-label={t("ariaLabel.selectColor", { color: c.name })}
              >
                <span className={cn("size-4 rounded-full", c.swatch)} />
              </Button>
            ))}
          </div>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function IconPicker({
  value,
  onChange,
  disabled,
}: {
  value: string
  onChange: (icon: string) => void
  disabled?: boolean
}) {
  const t = useTranslations("settings.subjects")
  const [open, setOpen] = useState(false)
  const icons = getSubjectIcons()

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={disabled}
            className="hover:bg-foreground/10!"
            aria-label={t("ariaLabel.chooseIcon")}
          />
        }
      >
        <SubjectIcon icon={value} className="size-3.5 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64 pr-2 overflow-y-auto max-h-80">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{t("iconDropdownLabel")}</DropdownMenuLabel>
          <div className="grid grid-cols-4 gap-3 p-2.5">
            {icons.map(({ name, Icon }) => (
              <Button
                key={name}
                variant="ghost"
                onClick={() => {
                  onChange(name)
                  setOpen(false)
                }}
                className={cn(
                  "size-10 p-0! rounded-lg",
                  name === value ? "bg-foreground/10!" : "hover:bg-foreground/10!"
                )}
                aria-label={t("ariaLabel.selectIcon", { icon: name })}
              >
                <Icon className="size-5" />
              </Button>
            ))}
          </div>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}