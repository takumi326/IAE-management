import { useMemo, useState } from "react"
import { api, type IncomeTypeCode, type MinorCategory } from "../lib/api.ts"
import { apiErrorMessage } from "../lib/errors.ts"
import { FieldLabel, FormActions, FormError, Modal } from "./Modal.tsx"

type Props = {
  onClose: () => void
  onCreated: () => void
  minors: MinorCategory[]
}

export function IncomeMasterFormModal({ onClose, onCreated, minors }: Props) {
  const incomeMinors = useMemo(
    () => minors.filter((m) => m.major_category.kind === "income"),
    [minors],
  )

  const [minorId, setMinorId] = useState<number | "">(incomeMinors[0]?.id ?? "")
  const [incomeType, setIncomeType] = useState<IncomeTypeCode>("recurring")
  const [startMonth, setStartMonth] = useState<string>(currentMonthInput())
  const [endMonth, setEndMonth] = useState<string>("")
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (minorId === "") return
    setSubmitting(true)
    setErrorMessage(null)
    try {
      await api.createIncome({
        minor_category_id: Number(minorId),
        income_type: incomeType,
        start_month: monthInputToDate(startMonth),
        end_month: endMonth ? monthInputToDate(endMonth) : null,
      })
      onCreated()
    } catch (err) {
      setErrorMessage(apiErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal title="収入マスタを追加" onClose={onClose}>
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
        <FormActions onCancel={onClose} submitting={submitting} disabled={minorId === "" || !startMonth} />
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
