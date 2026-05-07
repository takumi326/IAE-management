export function formatYen(amount: number): string {
  return `¥${amount.toLocaleString("ja-JP")}`
}

export function formatYenDelta(amount: number): string {
  const sign = amount > 0 ? "+" : amount < 0 ? "−" : ""
  return `${sign}¥${Math.abs(amount).toLocaleString("ja-JP")}`
}
