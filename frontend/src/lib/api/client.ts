const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = "ApiError"
    this.status = status
  }
}

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>
}

function buildUrl(path: string, params?: RequestOptions["params"]) {
  const url = new URL(path, API_BASE_URL)

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        url.searchParams.set(key, String(value))
      }
    }
  }

  return url.toString()
}


export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { params, headers, ...init } = options

  const res = await fetch(buildUrl(path, params), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  })

  if (!res.ok) {
    throw new ApiError(`Request to ${path} failed with status ${res.status}`, res.status)
  }

  return res.json() as Promise<T>
}


export function mockResolve<T>(data: T, delayMs = 300): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(data), delayMs))
}