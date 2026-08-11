const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "/api"

export class ApiError extends Error {
  status: number
  body?: unknown

  constructor(message: string, status: number, body?: unknown) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.body = body
  }
}

export interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>
  baseUrl?: string
}

function buildUrl(path: string, params?: RequestOptions["params"], baseUrl?: string) {
  const base = baseUrl ?? API_BASE_URL
  if (!params || Object.keys(params).length === 0) {
    return `${base}${path}`
  }

  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      search.set(key, String(value))
    }
  }

  return `${base}${path}?${search.toString()}`
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { params, baseUrl, headers, ...init } = options

  const res = await fetch(buildUrl(path, params, baseUrl), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  })

  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new ApiError(`Request to ${path} failed with status ${res.status}`, res.status, body)
  }

  return res.json() as Promise<T>
}

export async function mockResolve<T>(data: T): Promise<T> {
  return data
}