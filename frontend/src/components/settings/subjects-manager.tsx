"use client"

import { useEffect, useState } from "react"
import { Check, Loader2, Pencil, Plus, Trash2, X } from "lucide-react"

import { Button } from "@/components/ui/button"
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
import { createSubject, deleteSubject, getSubjects, renameSubject } from "@/lib/api/settings"
import type { Subject } from "@/types"

function errorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    const body = err.body as { message?: string } | null
    return body?.message ?? "Something went wrong. Please try again."
  }
  return "Something went wrong. Please try again."
}

export function SubjectsManager() {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [createOpen, setCreateOpen] = useState(false)
  const [name, setName] = useState("")
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState("")
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
      const subject = await createSubject(name.trim())
      setSubjects((prev) => [...prev, subject])
      setName("")
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
  }

  function stopEditing() {
    setEditingId(null)
    setEditValue("")
  }

  async function handleRename(subject: Subject) {
    const trimmed = editValue.trim()
    if (!trimmed || trimmed === subject.name) {
      stopEditing()
      return
    }

    setSavingId(subject.id)

    try {
      const updated = await renameSubject(subject.id, trimmed)
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
      setError(errorMessage(err))
    } finally {
      setDeletingBusy(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
      </div>
    )
  }

  if (loadError) {
    return (
      <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/25 rounded-md px-3 py-2">
        {loadError}
      </p>
    )
  }

  if (subjects.length === 0) {
    return (
      <>
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg py-24 text-center">
          <p className="text-sm text-muted-foreground">No subjects yet.</p>
          <Button onClick={() => setCreateOpen(true)} className="gap-1.5">
            <Plus className="size-4" />
            Create one
          </Button>
        </div>

        <CreateSubjectDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          name={name}
          onNameChange={setName}
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
          New subject
        </Button>
      </div>

      <div className="rounded-lg border border-border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="w-24 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...subjects]
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((subject) => (
                <TableRow key={subject.id}>
                  <TableCell>
                    {editingId === subject.id ? (
                      <Input
                        autoFocus
                        value={editValue}
                        onChange={(event) => setEditValue(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") handleRename(subject)
                          if (event.key === "Escape") stopEditing()
                        }}
                        maxLength={50}
                        className="h-7 max-w-xs rounded-sm"
                      />
                    ) : (
                      <span>{subject.name}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex items-center gap-1">
                      {editingId === subject.id ? (
                        <>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => handleRename(subject)}
                            disabled={savingId === subject.id}
                            className="hover:bg-foreground/10!"
                            aria-label={`Save rename to ${subject.name}`}
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
                            aria-label="Cancel renaming"
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
                            aria-label={`Rename ${subject.name}`}
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
                            aria-label={`Delete ${subject.name}`}
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
        <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/25 rounded-md px-3 py-2">
          {error}
        </p>
      )}

      <CreateSubjectDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        name={name}
        onNameChange={setName}
        creating={creating}
        error={error}
        onErrorChange={setError}
        onSubmit={handleCreate}
      />

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete &ldquo;{deleteTarget?.name}&rdquo;?</DialogTitle>
            <DialogDescription>
              This can&apos;t be undone. Anything using this subject may break.
            </DialogDescription>
          </DialogHeader>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deletingBusy}
              className="gap-1.5"
            >
              {deletingBusy && <Loader2 className="size-4 animate-spin" />}
              Delete
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
  creating,
  error,
  onErrorChange,
  onSubmit,
}: CreateSubjectDialogProps) {
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
            <DialogTitle>Create subject</DialogTitle>
            <DialogDescription>Pick a name between 3 and 50 characters.</DialogDescription>
          </DialogHeader>

          <Input
            autoFocus
            value={name}
            onChange={(event) => onNameChange(event.target.value)}
            placeholder="Subject name..."
            maxLength={50}
            required
            minLength={3}
          />

          {error && (
            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/25 rounded-md px-3 py-2">
              {error}
            </p>
          )}

          
            
          <Button type="submit" disabled={creating || name.trim().length < 3} className="gap-1.5">
            {creating && <Loader2 className="size-4 animate-spin" />}
            Create
          </Button>

        </form>
      </DialogContent>
    </Dialog>
  )
}
