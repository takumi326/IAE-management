import type { UserPreferences } from "./api.ts"

export function stockDailyPromptsFromPrefs(p: UserPreferences): {
  hypothesis: string
  result: string
  sector: string
} {
  return {
    hypothesis: (p.stock_daily_hypothesis_prompt ?? "").trimEnd(),
    result: (p.stock_daily_result_prompt ?? "").trimEnd(),
    sector: (p.stock_daily_sector_prompt ?? "").trimEnd(),
  }
}

/** `YYYY-MM-DD` → `YYYY年MM月DD日` */
export function formatRecordDateJp(isoDate: string): string {
  const parts = isoDate.split("-")
  if (parts.length !== 3) return isoDate
  const [y, mo, da] = parts
  const yn = Number(y)
  const mon = Number(mo)
  const dayn = Number(da)
  if (!Number.isFinite(yn) || !Number.isFinite(mon) || !Number.isFinite(dayn)) return isoDate
  return `${yn}年${String(mon).padStart(2, "0")}月${String(dayn).padStart(2, "0")}日`
}

/** 株プロンプト用。コピー時に `recordedOnIso`（YYYY-MM-DD）とその日の仮説本文へ置換する */
export function applyStockPromptPlaceholders(
  text: string,
  recordedOnIso: string,
  hypothesisBody: string,
): string {
  const jp = formatRecordDateJp(recordedOnIso)
  return text
    .replace(/\{\{\s*date_iso\s*\}\}/gi, recordedOnIso)
    .replace(/\{\{\s*date\s*\}\}/gi, jp)
    .replace(/\{\{\s*記録日\s*\}\}/g, jp)
    .replace(/\{\{\s*hypothesis\s*\}\}/gi, () => hypothesisBody)
}
