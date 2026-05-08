import { useMemo, useState } from "react"
import { api, type IncomeMaster, type IncomeTypeCode, type MinorCategory } from "../lib/api.ts"
import { apiErrorMessage } from "../lib/errors.ts"
import { FieldLabel, FormActions, FormError, Modal } from "./Modal.tsx"

type Props = {
  onClose: () => void
  onSaved: () => void
  minors: MinorCategory[]
  initial?: IncomeMaster
}

export function IncomeMasterFormModal({ onClose, onSaved, minors, initial }: Props) {
  const incomeMinors = useMemo(
    () => minors.filter((m) => m.major_category.kind === "income"),
    [minors],
  )

  const [minorId, setMinorId] = useState<number | "">(initial?.minor_category_id ?? incomeMinors[0]?.id ?? "")
  const [incomeType, setIncomeType] = useState<IncomeTypeCode>(initial?.income_type ?? "recurring")
  const [amount, setAmount] = useState<string>(initial?.amount != null ? String(initial.amount) : "")
  const [startMonth, setStartMonth] = useState<string>(initial ? dateToMonthInput(initial.start_month) : currentMonthInput())
  const [endMonth, setEndMonth] = useState<string>(initial?.end_month ? dateToMonthInput(initial.end_month) : "")
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (minorId === "") return
    const numericAmount = Number(amount)
    if (!Number.isFinite(numericAmount) || numericAmount < 0) {
      setErrorMessage("金額は0以上で入力してください")
      return
    }
    setSubmitting(true)
    setErrorMessage(null)
    try {
      const payload = {
        minor_category_id: Number(minorId),
        income_type: incomeType,
        amount: Math.round(numericAmount),
        start_month: monthInputToDate(startMonth),
        end_month: endMonth ? monthInputToDate(endMonth) : null,
      }
      if (initial) {
        await api.updateIncome(initial.id, payload)
      } else {
        await api.createIncome(payload)
      }
      onSaved()
    } catch (err) {
      setErrorMessage(apiErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal title={initial ? "収入を編集" : "収入を追加"} onClose={onClose}>
      <form className="space-y-3" onSubmit={onSubmit}>
        <FormError message={errorMessage} />
        <label className="block text-sm">
          <FieldLabel>カテゴリ（小）</FieldLabel>
          <select
            value={minorId}
            onChange={(e) => setMinorId(e.target.value === "" ? "" : Number(e.target.value))}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            required
          >
            {incomeMinors.length === 0 && <option value="">収入の小カテゴリを登録してください</option>}
            {incomeMinors.map((m) => (
              <option key={m.id} value={m.id}>
                {m.major_category.name} / {m.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <FieldLabel>種別</FieldLabel>
          <select
            value={incomeType}
            onChange={(e) => setIncomeType(e.target.value as IncomeTypeCode)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="recurring">定期</option>
            <option value="one_time">単発</option>
          </select>
        </label>
        <label className="block text-sm">
          <FieldLabel>金額</FieldLabel>
          <input
            type="number"
            min="0"
            step="1"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="例: 320000"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            required
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm">
            <FieldLabel>開始月</FieldLabel>
            <input
              type="month"
              value={startMonth}
              onChange={(e) => setStartMonth(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              required
            />
          </label>
          <label className="block text-sm">
            <FieldLabel>終了月（任意）</FieldLabel>
            <input
              type="month"
              value={endMonth}
              onChange={(e) => setEndMonth(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
        </div>
        <FormActions onCancel={onClose} submitting={submitting} disabled={minorId === "" || !startMonth || amount === ""} />
      </form>
    </Modal>
  )
}

function currentMonthInput(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
}

function monthInputToDate(value: string): string {
  return `${value}-01`
}

function dateToMonthInput(value: string): string {
  return value.slice(0, 7)
}
