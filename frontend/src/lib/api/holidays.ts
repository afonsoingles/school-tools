import { apiFetch } from "@/lib/api/client"

export interface HolidaySettingsResponse {
  auto_cancel_enabled: boolean
  overrides: string[]
  country: string | null
}

export async function getHolidaySettings(): Promise<HolidaySettingsResponse> {
  const res = await apiFetch<{ success: boolean } & HolidaySettingsResponse>("/v1/holidays")
  return {
    auto_cancel_enabled: res.auto_cancel_enabled,
    overrides: res.overrides,
    country: res.country,
  }
}

export async function setHolidayAutoCancel(enabled: boolean): Promise<HolidaySettingsResponse> {
  const res = await apiFetch<{ success: boolean } & HolidaySettingsResponse>("/v1/holidays", {
    method: "PATCH",
    body: JSON.stringify({ auto_cancel_enabled: enabled }),
  })
  return {
    auto_cancel_enabled: res.auto_cancel_enabled,
    overrides: res.overrides,
    country: res.country,
  }
}

export async function overrideHoliday(date: string): Promise<HolidaySettingsResponse> {
  const res = await apiFetch<{ success: boolean } & HolidaySettingsResponse>("/v1/holidays/overrides", {
    method: "POST",
    body: JSON.stringify({ date }),
  })
  return {
    auto_cancel_enabled: res.auto_cancel_enabled,
    overrides: res.overrides,
    country: res.country,
  }
}

export async function unoverrideHoliday(date: string): Promise<HolidaySettingsResponse> {
  const res = await apiFetch<{ success: boolean } & HolidaySettingsResponse>(
    `/v1/holidays/overrides/${date}`,
    { method: "DELETE" },
  )
  return {
    auto_cancel_enabled: res.auto_cancel_enabled,
    overrides: res.overrides,
    country: res.country,
  }
}