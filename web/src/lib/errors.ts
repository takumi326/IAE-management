import { ApiError } from "./api.ts"

export function apiErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.details) {
      const detail = Object.entries(err.details)
        .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
        .join(" / ")
      if (detail) return detail
    }
    return err.message
  }
  return err instanceof Error ? err.message : String(err)
}
