import { useState } from "react"
import { api, type CategoryKind } from "../lib/api.ts"
import { apiErrorMessage } from "../lib/errors.ts"
import { FieldLabel, FormActions, FormError, Modal } from "./Modal.tsx"

type Props = {
  onClose: () => void
  onSaved: () => void
  kind: CategoryKind
  /** ISO date string e.g. "2026-05-01" */
  month: string
  /** Optional pre-filled amount for editing */
  initialAmount?: number
}

export function ForecastFormModal({ onClose, onSaved, kind, month, initialAmount }: Props) {
  const [amount, setAmount] = useState<string>(initialAmount != null ? String(initialAmount) : "")
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

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
      await api.upsertForecast({ kind, month, amount: Math.round(numeric) })
      onSaved()
    } catch (err) {
      setErrorMessage(apiErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  const kindLabel = kind === "expense" ? "支出" : "収入"
  const monthLabel = formatMonthDisplay(month)

  return (
    <Modal title={`${monthLabel}の${kindLabel}予測を編集`} onClose={onClose} size="sm">
      <form className="space-y-3" onSubmit={onSubmit}>
        <FormError message={errorMessage} />
        <p className="text-xs text-slate-500">
          {monthLabel} / {kindLabel}（同じ月・種別の予測は上書きされます）
        </p>
        <label className="block text-sm">
          <FieldLabel>金額</FieldLabel>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-slate-500">¥</span>
            <input
              type="number"
              min="0"
              step="1000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="200000"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              required
            />
          </div>
        </label>
        <FormActions onCancel={onClose} submitting={submitting} disabled={amount === ""} />
      </form>
    </Modal>
  )
}

function formatMonthDisplay(month: string): string {
  const [y, m] = month.split("-")
  if (!y || !m) return month
  return `${y}年${Number(m)}月`
}
