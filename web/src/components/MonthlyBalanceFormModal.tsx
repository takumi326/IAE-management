import { useEffect, useState } from "react"
import { api } from "../lib/api.ts"
import { apiErrorMessage } from "../lib/errors.ts"
import { FieldLabel, FormActions, FormError, Modal } from "./Modal.tsx"

type Props = {
  onClose: () => void
  onSaved: () => void
  /** ISO date e.g. "2026-05-01" */
  month: string
}

function formatMonthDisplay(month: string): string {
  const [y, m] = month.split("-")
  if (!y || !m) return month
  return `${y}年${Number(m)}月`
}

function toNumber(value: string | number): number {
  const n = typeof value === "string" ? Number(value) : value
  return Number.isFinite(n) ? n : 0
}

export function MonthlyBalanceFormModal({ onClose, onSaved, month }: Props) {
  const [amount, setAmount] = useState("")
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void api
      .dashboard(month)
      .then((d) => {
        if (cancelled) return
        setAmount(String(toNumber(d.monthly_balance)))
      })
      .catch(() => {
        if (cancelled) return
        setAmount("")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [month])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const numeric = Number(amount)
    if (!Number.isFinite(numeric) || numeric < 0) {
      setErrorMessage("0以上の数値を入力してください")
      return
    }
    setSubmitting(true)
    setErrorMessage(null)
    try {
      await api.upsertMonthlyBalance({ month, amount: Math.round(numeric) })
      onSaved()
    } catch (err) {
      setErrorMessage(apiErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  const monthLabel = formatMonthDisplay(month)

  return (
    <Modal title={`${monthLabel}の月末残高を編集`} onClose={onClose} size="sm">
      <form className="space-y-3" onSubmit={onSubmit}>
        <FormError message={errorMessage} />
        <p className="text-xs text-slate-500">保存すると今年度サマリの「実」表示に反映されます。</p>
        <label className="block text-sm">
          <FieldLabel>月末残高（円）</FieldLabel>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-slate-500">¥</span>
            <input
              type="number"
              min="0"
              step="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="2300000"
              disabled={loading}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50"
              required
            />
          </div>
        </label>
        <FormActions onCancel={onClose} submitting={submitting} disabled={amount === "" || loading} />
      </form>
    </Modal>
  )
}
