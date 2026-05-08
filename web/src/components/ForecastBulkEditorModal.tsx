import { useMemo, useState } from "react"
import { api, type Forecast } from "../lib/api.ts"
import { apiErrorMessage } from "../lib/errors.ts"
import { FormActions, FormError, Modal } from "./Modal.tsx"

type Row = {
  month: string
  income: string
  expense: string
}

type Props = {
  onClose: () => void
  onSaved: () => void
  forecasts: Forecast[]
  startMonth: string
}

export function ForecastBulkEditorModal({ onClose, onSaved, forecasts, startMonth }: Props) {
  const initialRows = useMemo(() => buildRows(forecasts, startMonth), [forecasts, startMonth])
  const [rows, setRows] = useState<Row[]>(initialRows)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const updateAmount = (idx: number, kind: "income" | "expense", value: string) => {
    setRows((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, [kind]: value } : r)),
    )
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setErrorMessage(null)
    try {
      for (const row of rows) {
        const income = Number(row.income)
        const expense = Number(row.expense)
        if (!Number.isFinite(income) || income < 0 || !Number.isFinite(expense) || expense < 0) {
          throw new Error("金額は0以上で入力してください")
        }
        await api.upsertForecast({ kind: "income", month: row.month, amount: Math.round(income) })
        await api.upsertForecast({ kind: "expense", month: row.month, amount: Math.round(expense) })
      }
      onSaved()
    } catch (err) {
      setErrorMessage(apiErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal title="予測をまとめて編集（今月以降12ヶ月）" onClose={onClose}>
      <form className="space-y-3" onSubmit={onSubmit}>
        <FormError message={errorMessage} />
        <div className="max-h-[60vh] overflow-y-auto rounded-lg border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs text-slate-500">
              <tr>
                <th className="px-3 py-2">月</th>
                <th className="px-3 py-2">収入</th>
                <th className="px-3 py-2">支出</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row, idx) => (
                <tr key={row.month}>
                  <td className="px-3 py-2">{formatMonth(row.month)}</td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={row.income}
                      onChange={(e) => updateAmount(idx, "income", e.target.value)}
                      className="w-full rounded border border-slate-300 px-2 py-1"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={row.expense}
                      onChange={(e) => updateAmount(idx, "expense", e.target.value)}
                      className="w-full rounded border border-slate-300 px-2 py-1"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <FormActions onCancel={onClose} submitting={submitting} />
      </form>
    </Modal>
  )
}

function buildRows(forecasts: Forecast[], startMonth: string): Row[] {
  const map = new Map<string, number>()
  forecasts.forEach((f) => {
    const amount = typeof f.amount === "string" ? Number(f.amount) : f.amount
    map.set(`${f.kind}:${f.month}`, Number.isFinite(amount) ? amount : 0)
  })

  const rows: Row[] = []
  for (let i = 0; i < 12; i += 1) {
    const month = addMonths(startMonth, i)
    rows.push({
      month,
      income: String(map.get(`income:${month}`) ?? 0),
      expense: String(map.get(`expense:${month}`) ?? 0),
    })
  }
  return rows
}

function addMonths(date: string, delta: number): string {
  const [yRaw, mRaw] = date.split("-")
  const base = new Date(Number(yRaw), Number(mRaw) - 1, 1)
  base.setMonth(base.getMonth() + delta)
  const y = base.getFullYear()
  const m = String(base.getMonth() + 1).padStart(2, "0")
  return `${y}-${m}-01`
}

function formatMonth(date: string): string {
  const [y, m] = date.split("-")
  return `${y}/${m}`
}
