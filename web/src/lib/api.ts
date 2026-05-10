import { getSupabaseAccessToken } from "./supabase.ts"

export type CategoryKind = "expense" | "income"
export type ExpenseTypeCode = "one_time" | "recurring"
export type RecurringCycleCode = "monthly" | "yearly"
export type IncomeTypeCode = "one_time" | "recurring"
export type PaymentMethodType = "card" | "bank_debit" | "bank_withdrawal"

/** クレカ・口座引き落とし。台帳の支出を「対象月」か「翌月」に載せるか */
export type LedgerChargeTiming = "same_month" | "next_month"

export type MajorCategory = {
  id: number
  kind: CategoryKind
  name: string
}

export type MinorCategory = {
  id: number
  name: string
  major_category: MajorCategory
}

export type PaymentMethod = {
  id: number
  name: string
  method_type: PaymentMethodType
  /** 廃止予定。クレカでは常に null */
  closing_day: number | null
  /** 廃止予定。クレカでは常に null */
  debit_day: number | null
  /** クレカ・口座引き落としのみ。未返却時は API 側で既定（クレカは翌月・引落は当月） */
  ledger_charge_timing: LedgerChargeTiming | null
}

export type ExpenseMaster = {
  id: number
  minor_category_id: number
  payment_method_id: number
  expense_type: ExpenseTypeCode
  recurring_cycle: RecurringCycleCode
  renewal_month: number | null
  amount: string | number
  start_month: string
  end_month: string | null
  /** 任意メモ（マスタ単位） */
  memo?: string | null
}

export type IncomeMaster = {
  id: number
  minor_category_id: number
  income_type: IncomeTypeCode
  amount: string | number
  start_month: string
  end_month: string | null
}

export type Forecast = {
  id: number
  kind: CategoryKind
  month: string
  amount: string | number
}

export type ApiErrorBody = {
  error?: {
    code?: string
    message?: string
    details?: Record<string, string[] | string>
  }
}

export class ApiError extends Error {
  status: number
  details?: Record<string, string[] | string>

  constructor(status: number, message: string, details?: Record<string, string[] | string>) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.details = details
  }
}

type Envelope<T> = { data: T }

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/+$/, "")

function withApiBase(path: string): string {
  if (!API_BASE_URL) return path
  return `${API_BASE_URL}${path}`
}

async function parseError(response: Response): Promise<ApiError> {
  const body = await response.json().catch((): ApiErrorBody | null => null)
  const message = body?.error?.message ?? `${response.status} ${response.statusText}`
  return new ApiError(response.status, message, body?.error?.details)
}

const API_FETCH_TIMEOUT_MS = 15_000

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const accessToken = import.meta.env.DEV ? null : await getSupabaseAccessToken()
  const timeoutController = new AbortController()
  const timeoutId = window.setTimeout(() => timeoutController.abort(), API_FETCH_TIMEOUT_MS)

  const mergedSignal =
    init?.signal && typeof AbortSignal !== "undefined" && typeof AbortSignal.any === "function"
      ? AbortSignal.any([init.signal, timeoutController.signal])
      : timeoutController.signal

  try {
    const response = await fetch(withApiBase(path), {
      ...init,
      signal: mergedSignal,
      headers: {
        Accept: "application/json",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...(init?.headers ?? {}),
      },
    })

    if (!response.ok) {
      throw await parseError(response)
    }
    if (response.status === 204) {
      return undefined as T
    }
    const body = (await response.json()) as Envelope<T>
    return body.data
  } finally {
    window.clearTimeout(timeoutId)
  }
}

function postJson<T>(path: string, body: unknown): Promise<T> {
  return fetchJson<T>(path, { method: "POST", body: JSON.stringify(body) })
}

function patchJson<T>(path: string, body: unknown): Promise<T> {
  return fetchJson<T>(path, { method: "PATCH", body: JSON.stringify(body) })
}

function deleteJson(path: string): Promise<void> {
  return fetchJson<void>(path, { method: "DELETE" })
}

export type CreateMajorCategoryInput = {
  kind: CategoryKind
  name: string
}

export type CreateMinorCategoryInput = {
  major_category_id: number
  name: string
}

export type UpdateMajorCategoryInput = {
  kind: CategoryKind
  name: string
}

export type UpdateMinorCategoryInput = {
  major_category_id: number
  name: string
}

export type CreatePaymentMethodInput = {
  name: string
  method_type: PaymentMethodType
  closing_day?: number | null
  debit_day?: number | null
  ledger_charge_timing?: LedgerChargeTiming | null
}

export type UpdatePaymentMethodInput = Partial<CreatePaymentMethodInput>

export type ExpenseMasterInput = {
  minor_category_id: number
  payment_method_id: number
  expense_type: ExpenseTypeCode
  recurring_cycle?: RecurringCycleCode
  renewal_month?: number | null
  amount: number
  start_month: string
  end_month?: string | null
  memo?: string | null
}

export type IncomeMasterInput = {
  minor_category_id: number
  income_type: IncomeTypeCode
  amount: number
  start_month: string
  end_month?: string | null
}

export type UpsertForecastInput = {
  kind: CategoryKind
  month: string
  amount: number
}

export type SyncActualsInput = {
  month?: string
  /** 省略: 単発+定期。one_time: 単発のみ（month 必須）。recurring: 定期のみ（month があればその月を含む今年度12ヶ月、無ければ当月基準の今年度） */
  expense_scope?: "one_time" | "recurring"
}

export type SyncActualsByMonth = {
  month: string
  created_expense_count: number
  created_income_count: number
}

export type SyncActualsResult = {
  /** month 指定なしのときのみ（今月・来月） */
  months?: string[]
  by_month?: SyncActualsByMonth[]
  created_expense_count: number
  created_income_count: number
}

export type MasterActual = {
  transaction_id: number
  month: string
  amount: string | number
}

/** 支出実績の PATCH 用。amount は支出として正の数（API が負の台帳に変換） */
export type MasterActualUpdateInput = {
  month: string
  amount: number
}

export type BreakdownMode = "実" | "予"
export type BreakdownItem = {
  label: string
  amount: string | number
  mode: BreakdownMode
}
export type CategoryBreakdownGroup = {
  major: string
  mode: BreakdownMode
  minors: BreakdownItem[]
}

export type DashboardExpenseLineItem = {
  expense_id: number
  expense_type: ExpenseTypeCode
  recurring_cycle: RecurringCycleCode | null
  major: string
  minor: string
  payment: string
  amount: string | number
  memo: string | null
}

export type DashboardSummary = {
  month: string
  expense_by_payment: BreakdownItem[]
  expense_by_category_groups: CategoryBreakdownGroup[]
  expense_line_items: DashboardExpenseLineItem[]
  monthly_balance: string | number
}

export type FiscalActualMonthRow = {
  month: string
  has_income_actual: boolean
  has_expense_actual: boolean
  /** 単発支出の台帳がある（ダッシュボード支出サマリーが「実」になる条件） */
  has_one_time_expense_actual: boolean
  income_actual: number
  expense_actual: number
  /** 月末残高が DB に保存されているか（今年度表の「実」はこれのみ） */
  has_monthly_balance: boolean
  /** DB に保存された月末残高（円）。未保存の月は null */
  monthly_balance_amount: string | number | null
}
export type MonthlyBalance = {
  month: string
  amount: string | number
}
export type AuthUser = {
  email: string
}

export type UserPreferences = {
  import_claude_prompt_template: string | null
}

export type UserPreferencesInput = {
  import_claude_prompt_template: string | null
}

export const api = {
  me: () => fetchJson<AuthUser>("/api/auth/me"),
  signOut: () => deleteJson("/api/auth/logout"),

  majorCategories: () => fetchJson<MajorCategory[]>("/api/categories/majors"),
  minorCategories: () => fetchJson<MinorCategory[]>("/api/categories/minors"),
  paymentMethods: () => fetchJson<PaymentMethod[]>("/api/payment_methods"),
  expenses: () => fetchJson<ExpenseMaster[]>("/api/expenses"),
  incomes: () => fetchJson<IncomeMaster[]>("/api/incomes"),
  forecasts: () => fetchJson<Forecast[]>("/api/forecasts"),

  createMajorCategory: (input: CreateMajorCategoryInput) =>
    postJson<MajorCategory>("/api/categories/majors", { major_category: input }),
  createMinorCategory: (input: CreateMinorCategoryInput) =>
    postJson<MinorCategory>("/api/categories/minors", { minor_category: input }),
  updateMajorCategory: (id: number, input: UpdateMajorCategoryInput) =>
    patchJson<MajorCategory>(`/api/categories/majors/${id}`, { major_category: input }),
  updateMinorCategory: (id: number, input: UpdateMinorCategoryInput) =>
    patchJson<MinorCategory>(`/api/categories/minors/${id}`, { minor_category: input }),
  deleteMajorCategory: (id: number) => deleteJson(`/api/categories/majors/${id}`),
  deleteMinorCategory: (id: number) => deleteJson(`/api/categories/minors/${id}`),

  createPaymentMethod: (input: CreatePaymentMethodInput) =>
    postJson<PaymentMethod>("/api/payment_methods", { payment_method: input }),
  updatePaymentMethod: (id: number, input: UpdatePaymentMethodInput) =>
    patchJson<PaymentMethod>(`/api/payment_methods/${id}`, { payment_method: input }),
  deletePaymentMethod: (id: number) => deleteJson(`/api/payment_methods/${id}`),

  createExpense: (input: ExpenseMasterInput) =>
    postJson<ExpenseMaster>("/api/expenses", { expense: input }),
  updateExpense: (id: number, input: Partial<ExpenseMasterInput>) =>
    patchJson<ExpenseMaster>(`/api/expenses/${id}`, { expense: input }),
  deleteExpense: (id: number) => deleteJson(`/api/expenses/${id}`),
  expenseActuals: (id: number) => fetchJson<MasterActual[]>(`/api/expenses/${id}/actuals`),
  deleteExpenseActual: (expenseId: number, transactionId: number) =>
    deleteJson(`/api/expenses/${expenseId}/actuals/${transactionId}`),
  updateExpenseActual: (expenseId: number, transactionId: number, input: MasterActualUpdateInput) =>
    patchJson<MasterActual>(`/api/expenses/${expenseId}/actuals/${transactionId}`, { actual: input }),

  createIncome: (input: IncomeMasterInput) =>
    postJson<IncomeMaster>("/api/incomes", { income: input }),
  updateIncome: (id: number, input: Partial<IncomeMasterInput>) =>
    patchJson<IncomeMaster>(`/api/incomes/${id}`, { income: input }),
  deleteIncome: (id: number) => deleteJson(`/api/incomes/${id}`),
  incomeActuals: (id: number) => fetchJson<MasterActual[]>(`/api/incomes/${id}/actuals`),
  deleteIncomeActual: (incomeId: number, transactionId: number) =>
    deleteJson(`/api/incomes/${incomeId}/actuals/${transactionId}`),
  updateIncomeActual: (incomeId: number, transactionId: number, input: MasterActualUpdateInput) =>
    patchJson<MasterActual>(`/api/incomes/${incomeId}/actuals/${transactionId}`, { actual: input }),

  upsertForecast: (input: UpsertForecastInput) =>
    postJson<Forecast>("/api/forecasts/upsert", { forecast: input }),
  syncActuals: (input?: SyncActualsInput) =>
    postJson<SyncActualsResult>("/api/actuals/sync", input ?? {}),

  dashboard: (month: string) => fetchJson<DashboardSummary>(`/api/dashboard?month=${encodeURIComponent(month)}`),
  fiscalActuals: (month: string) =>
    fetchJson<FiscalActualMonthRow[]>(
      `/api/dashboard/fiscal_actuals?month=${encodeURIComponent(month)}`,
    ),
  monthlyBalances: (month: string) => fetchJson<MonthlyBalance[]>(`/api/monthly_balances?month=${encodeURIComponent(month)}`),
  upsertMonthlyBalance: (input: { month: string; amount: number }) =>
    postJson<MonthlyBalance>("/api/monthly_balances/upsert", { monthly_balance: input }),

  userPreferences: () => fetchJson<UserPreferences>("/api/preferences/import_prompt"),
  updateUserPreferences: (input: UserPreferencesInput) =>
    patchJson<UserPreferences>("/api/preferences/import_prompt", { user_preference: input }),
}
