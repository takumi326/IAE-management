import { type FormEvent, useMemo, useState } from "react"
import { api } from "../lib/api.ts"
import { apiErrorMessage } from "../lib/errors.ts"
import { useFetch } from "../lib/useFetch.ts"

type Props = {
  month: string
  onClose: () => void
  onSaved: () => void
}

export function ActualEditorModal({ month, onClose, onSaved }: Props) {
  const result = useFetch(() => Promise.all([api.minorCategories(), api.paymentMethods()]))
  const expenseMinors = useMemo(
    () => (result.status === "success" ? result.data[0].filter((m) => m.major_category.kind === "expense") : []),
    [result],
  )
  const paymentMethods = result.status === "success" ? result.data[1] : []
  const [minorId, setMinorId] = useState<number | "">("")
  const [paymentId, setPaymentId] = useState<number | "">("")
  const [amount, setAmount] = useState("")
  const [paymentDate, setPaymentDate] = useState(`${month}-01`)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (minorId === "" || paymentId === "") return
    const numericAmount = Number(amount)
    if (!Number.isFinite(numericAmount) || numericAmount < 0) {
      setErrorMessage("金額は0以上で入力してください")
      return
    }

    setSubmitting(true)
    setErrorMessage(null)
    try {
      await api.createExpense({
        minor_category_id: Number(minorId),
        payment_method_id: Number(paymentId),
        expense_type: "one_time",
        recurring_cycle: "monthly",
        renewal_month: null,
        amount: Math.round(numericAmount),
        start_month: `${paymentDate.slice(0, 7)}-01`,
        end_month: null,
      })
      await api.syncActuals({ month: `${paymentDate.slice(0, 7)}-01` })
      onSaved()
    } catch (error) {
      setErrorMessage(apiErrorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center bg-slate-900/40 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">単発の支出を追加</h3>
          <button type="button" className="text-slate-400 hover:text-slate-600" onClick={onClose}>
            ×
          </button>
        </div>

        <form className="space-y-3" onSubmit={submit}>
          {errorMessage && <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{errorMessage}</p>}
          <label className="block text-sm">
            <span className="text-slate-600">カテゴリ（小）</span>
            <select
              value={minorId}
              onChange={(e) => setMinorId(e.target.value === "" ? "" : Number(e.target.value))}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              required
            >
              <option value="">{result.status === "loading" ? "読み込み中…" : "カテゴリを選択"}</option>
              {expenseMinors.map((minor) => (
                <option key={minor.id} value={minor.id}>
                  {minor.major_category.name} / {minor.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-slate-600">支払方法</span>
            <select
              value={paymentId}
              onChange={(e) => setPaymentId(e.target.value === "" ? "" : Number(e.target.value))}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              required
            >
              <option value="">{result.status === "loading" ? "読み込み中…" : "支払方法を選択"}</option>
              {paymentMethods.map((method) => (
                <option key={method.id} value={method.id}>
                  {method.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-slate-600">種別</span>
            <select
              value="one_time"
              disabled
              className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 text-sm text-slate-700"
            >
              <option value="one_time">単発</option>
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-slate-600">金額（正の値）</span>
            <input
              type="number"
              min="0"
              step="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="例: 3500"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              required
            />
          </label>
          <label className="block text-sm">
            <span className="text-slate-600">支払日</span>
            <input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              required
            />
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={submitting || result.status !== "success"}
              className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-indigo-300"
            >
              {submitting ? "保存中…" : "保存"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
