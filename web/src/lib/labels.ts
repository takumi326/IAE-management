const kindLabels = {
  expense: "支出",
  income: "収入",
} as const

const recurringTypeLabels = {
  one_time: "単発",
  recurring: "定期",
} as const

const paymentMethodTypeLabels = {
  card: "クレジットカード",
  bank_debit: "口座引落",
  bank_withdrawal: "口座引き出し",
} as const

export function formatKindLabel(kind: string): string {
  return kindLabels[kind as keyof typeof kindLabels] ?? kind
}

export function formatRecurringTypeLabel(type: string): string {
  return recurringTypeLabels[type as keyof typeof recurringTypeLabels] ?? type
}

export function formatPaymentMethodTypeLabel(type: string): string {
  return paymentMethodTypeLabels[type as keyof typeof paymentMethodTypeLabels] ?? type
}

/** 締め日。null = 月末締め */
export function formatClosingDayLabel(day: number | null | undefined): string {
  return day == null ? "月末" : `${day}日`
}

/** クレカ：締め月の翌月の引落日 */
export function formatCardDebitDayLabel(day: number | null | undefined): string {
  return day == null ? "未設定" : `翌月${day}日`
}

/** 口座引落：当月のこの日に引き落とし */
export function formatBankDebitDayLabel(day: number | null | undefined): string {
  return day == null ? "未設定" : `毎月${day}日`
}

export function formatPaymentMethodSchedule(pm: {
  method_type: string
  closing_day: number | null
  debit_day: number | null
}): string {
  if (pm.method_type === "bank_withdrawal") {
    return "引き出し日の設定なし"
  }
  if (pm.method_type === "bank_debit") {
    return `引落 ${formatBankDebitDayLabel(pm.debit_day)}`
  }
  return `締め ${formatClosingDayLabel(pm.closing_day)}・引落 ${formatCardDebitDayLabel(pm.debit_day)}`
}
