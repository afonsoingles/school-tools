"use client"

import { useState } from "react"
import { Loader2, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"

export function ClearCacheButton() {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleClick() {
    setLoading(true)
    setMessage(null)
    setError(null)

    try {
      const res = await fetch("/api/v1/admin/clear_global_user_cache", {
        method: "POST",
      })
      const body = await res.json()

      if (res.ok && body.success) {
        setMessage(body.message ?? "Cache cleared successfully.")
      } else {
        setError(body.message ?? "Failed to clear cache.")
      }
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-4 max-w-sm">
      <Button variant="outline" onClick={handleClick} disabled={loading} className="gap-2">
        {loading ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
        Clear global user cache
      </Button>

      {message && (
        <p className="text-sm text-green-400 bg-green-500/10 border border-green-500/25 rounded-md px-3 py-2">
          {message}
        </p>
      )}

      {error && (
        <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/25 rounded-md px-3 py-2">
          {error}
        </p>
      )}
    </div>
  )
}
