const kindLabels = {
  expense: "支出",
  income: "収入",
} as const

const recurringTypeLabels = {
  one_time: "単発",
  recurring: "定期",
} as const

export function formatKindLabel(kind: string): string {
  return kindLabels[kind as keyof typeof kindLabels] ?? kind
}

export function formatRecurringTypeLabel(type: string): string {
  return recurringTypeLabels[type as keyof typeof recurringTypeLabels] ?? type
}
