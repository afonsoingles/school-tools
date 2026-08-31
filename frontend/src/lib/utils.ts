import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function safeNextPath(raw: string | null, fallback = "/dashboard"): string {
  if (raw && raw.startsWith("/") && !raw.startsWith("//")) return raw
  return fallback
}