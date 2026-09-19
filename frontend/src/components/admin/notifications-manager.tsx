"use client"

import { useRef, useState } from "react"
import { toast } from "sonner"
import { Loader2, Megaphone, Search, Send, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { getAdminUsers, sendAdminNotification } from "@/lib/api/admin"
import { errorMessage } from "@/lib/errors"
import type { User } from "@/types"

export function NotificationsManager() {
  const [target, setTarget] = useState<"all" | "specific">("all")
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<User[]>([])
  const [selected, setSelected] = useState<User | null>(null)
  const [searching, setSearching] = useState(false)

  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [deepLink, setDeepLink] = useState("")
  const [sending, setSending] = useState(false)

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  async function runSearch(value: string) {
    if (value.trim().length < 2) {
      setResults([])
      return
    }
    setSearching(true)
    try {
      const res = await getAdminUsers({ search: value.trim(), limit: 6 })
      setResults(res.users)
    } catch {
      setResults([])
    } finally {
      setSearching(false)
    }
  }

  function handleQueryChange(value: string) {
    setQuery(value)
    setSelected(null)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => runSearch(value), 300)
  }

  function reset() {
    setTitle("")
    setBody("")
    setDeepLink("")
    setQuery("")
    setResults([])
    setSelected(null)
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (target === "specific" && !selected) {
      toast.error("Pick a recipient first.")
      return
    }

    setSending(true)
    try {
      const delivered = await sendAdminNotification({
        title: title.trim(),
        body: body.trim(),
        deep_link: deepLink.trim() || undefined,
        user_id: target === "specific" ? selected?.id : undefined,
      })
      toast.success(`Notification sent to ${delivered} user${delivered === 1 ? "" : "s"}.`)
      reset()
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setSending(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Megaphone className="size-4 text-muted-foreground" />
          Send notification
        </CardTitle>
        <CardDescription>Send an in-app and push notification to one user or everyone.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-1.5">
            <Label>Recipient</Label>
            <Select value={target} onValueChange={(v) => setTarget(String(v) as "all" | "specific")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All users</SelectItem>
                <SelectItem value="specific">Specific user</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {target === "specific" && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="recipient-search">Find user</Label>
              {selected ? (
                <div className="flex items-center justify-between gap-2 rounded-lg border border-border bg-background px-3 py-2">
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-medium">{selected.name}</span>
                    <span className="truncate text-xs text-muted-foreground">{selected.email}</span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="hover:bg-foreground/10!"
                    onClick={() => setSelected(null)}
                    aria-label="Clear recipient"
                  >
                    <X className="size-3.5" />
                  </Button>
                </div>
              ) : (
                <>
                  <div className="relative">
                    <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="recipient-search"
                      className="pl-8"
                      placeholder="Search by name or email"
                      value={query}
                      onChange={(e) => handleQueryChange(e.target.value)}
                    />
                  </div>
                  {searching && (
                    <div className="flex items-center gap-2 px-1 text-xs text-muted-foreground">
                      <Loader2 className="size-3 animate-spin" />
                      Searching…
                    </div>
                  )}
                  {!searching && results.length > 0 && (
                    <div className="flex flex-col overflow-hidden border divide-y rounded-lg divide-border border-border bg-background">
                      {results.map((user) => (
                        <Button
                          key={user.id}
                          type="button"
                          variant="ghost"
                          onClick={() => {
                            setSelected(user)
                            setResults([])
                          }}
                          className="h-auto w-full flex-col items-start gap-0.5 rounded-none px-3 py-2 text-left"
                        >
                          <span className="truncate text-sm font-medium">{user.name}</span>
                          <span className="truncate text-xs text-muted-foreground">{user.email}</span>
                        </Button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notification-title">Title</Label>
            <Input
              id="notification-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Scheduled maintenance"
              maxLength={100}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notification-body">Message</Label>
            <Textarea
              id="notification-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="min-h-24 resize-y"
              placeholder="Write the message you want to send…"
              maxLength={500}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notification-link">Link (optional)</Label>
            <Input
              id="notification-link"
              value={deepLink}
              onChange={(e) => setDeepLink(e.target.value)}
              placeholder="/dashboard"
            />
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={sending} className="gap-1.5">
              {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-3.5" />}
              Send
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}