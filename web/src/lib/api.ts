export type MajorCategory = {
  id: number
  kind: number
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
  method_type: "card" | "bank_debit"
}

export type ExpenseMaster = {
  id: number
  minor_category_id: number
  payment_method_id: number
  expense_type: "one_time" | "recurring"
  start_month: string
  end_month: string | null
}

export type IncomeMaster = {
  id: number
  minor_category_id: number
  income_type: "one_time" | "recurring"
  start_month: string
  end_month: string | null
}

type Envelope<T> = { data: T }

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(path, {
    headers: { Accept: "application/json" },
  })
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status} ${response.statusText}`)
  }
  const body = (await response.json()) as Envelope<T>
  return body.data
}

export const api = {
  majorCategories: () => fetchJson<MajorCategory[]>("/api/categories/majors"),
  minorCategories: () => fetchJson<MinorCategory[]>("/api/categories/minors"),
  paymentMethods: () => fetchJson<PaymentMethod[]>("/api/payment_methods"),
  expenses: () => fetchJson<ExpenseMaster[]>("/api/expenses"),
  incomes: () => fetchJson<IncomeMaster[]>("/api/incomes"),
}
