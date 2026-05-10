import { useMemo, useState } from "react"
import {
  api,
  type ExpenseMaster,
  type RecurringCycleCode,
  type ExpenseTypeCode,
  type MinorCategory,
  type PaymentMethod,
} from "../lib/api.ts"
import { apiErrorMessage } from "../lib/errors.ts"
import { sortMinorCategories } from "../lib/categorySort.ts"
import { FieldLabel, FormActions, FormError, Modal } from "./Modal.tsx"

type Props = {
  onClose: () => void
  onSaved: () => void
  minors: MinorCategory[]
  paymentMethods: PaymentMethod[]
  initial?: ExpenseMaster
}

export function ExpenseMasterFormModal({ onClose, onSaved, minors, paymentMethods, initial }: Props) {
  const expenseMinors = useMemo(
    () => sortMinorCategories(minors.filter((m) => m.major_category.kind === "expense")),
    [minors],
  )

  const [minorId, setMinorId] = useState<number | "">(initial?.minor_category_id ?? expenseMinors[0]?.id ?? "")
  const [paymentId, setPaymentId] = useState<number | "">(initial?.payment_method_id ?? paymentMethods[0]?.id ?? "")
  const [expenseType, setExpenseType] = useState<ExpenseTypeCode>(initial?.expense_type ?? "one_time")
  const [recurringCycle, setRecurringCycle] = useState<RecurringCycleCode>(initial?.recurring_cycle ?? "monthly")
  const [renewalMonth, setRenewalMonth] = useState<number | "">(initial?.renewal_month ?? "")
  const [amount, setAmount] = useState<string>(initial?.amount != null ? String(initial.amount) : "")
  const [oneTimeMonth, setOneTimeMonth] = useState<string>(
    initial?.expense_type === "one_time" && initial ? dateToMonthInput(initial.start_month) : currentMonthInput(),
  )
  const [startMonth, setStartMonth] = useState<string>(initial ? dateToMonthInput(initial.start_month) : currentMonthInput())
  const [endMonth, setEndMonth] = useState<string>(initial?.end_month ? dateToMonthInput(initial.end_month) : "")
  const [memo, setMemo] = useState<string>(initial?.memo ?? "")
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (minorId === "" || paymentId === "") return
    const numericAmount = Number(amount)
    if (!Number.isFinite(numericAmount) || numericAmount < 0) {
      setErrorMessage("金額は0以上で入力してください")
      return
    }
    if (expenseType === "recurring" && recurringCycle === "yearly" && renewalMonth === "") {
      setErrorMessage("年次の場合は更新月を選択してください")
      return
    }
    setSubmitting(true)
    setErrorMessage(null)
    try {
      const payload = {
        minor_category_id: Number(minorId),
        payment_method_id: Number(paymentId),
        expense_type: expenseType,
        recurring_cycle: expenseType === "recurring" ? recurringCycle : "monthly",
        renewal_month: expenseType === "recurring" && recurringCycle === "yearly" ? Number(renewalMonth) : null,
        amount: Math.round(numericAmount),
        start_month: expenseType === "one_time" ? monthInputToDate(oneTimeMonth) : monthInputToDate(startMonth),
        end_month: expenseType === "one_time" ? null : endMonth ? monthInputToDate(endMonth) : null,
        memo: memo.trim() === "" ? null : memo.trim(),
      }
      if (initial) {
        await api.updateExpense(initial.id, payload)
      } else {
        await api.createExpense(payload)
      }
      if (expenseType === "one_time") {
        await api.syncActuals({ month: payload.start_month, expense_scope: "one_time" })
      }
      onSaved()
    } catch (err) {
      setErrorMessage(apiErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal title={initial ? "実績の編集" : "実績を追加"} onClose={onClose}>
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
            {expenseMinors.length === 0 && <option value="">支出の小カテゴリを登録してください</option>}
            {expenseMinors.map((m) => (
              <option key={m.id} value={m.id}>
                {m.major_category.name} / {m.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <FieldLabel>支払方法</FieldLabel>
          <select
            value={paymentId}
            onChange={(e) => setPaymentId(e.target.value === "" ? "" : Number(e.target.value))}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            required
          >
            {paymentMethods.length === 0 && <option value="">支払方法を登録してください</option>}
            {paymentMethods.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <FieldLabel>種別</FieldLabel>
          <select
            value={expenseType}
            onChange={(e) => {
              const next = e.target.value as ExpenseTypeCode
              setExpenseType(next)
              if (next === "one_time") {
                setRecurringCycle("monthly")
                setRenewalMonth("")
                setOneTimeMonth(startMonth)
              }
            }}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="one_time">単発</option>
            <option value="recurring">定期</option>
          </select>
        </label>
        {expenseType === "recurring" && (
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm">
              <FieldLabel>定期の周期</FieldLabel>
              <select
                value={recurringCycle}
                onChange={(e) => {
                  const next = e.target.value as RecurringCycleCode
                  setRecurringCycle(next)
                  if (next === "monthly") setRenewalMonth("")
                }}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="monthly">月次</option>
                <option value="yearly">年次</option>
              </select>
            </label>
            <label className="block text-sm">
              <FieldLabel>更新月（年次のみ）</FieldLabel>
              <select
                value={renewalMonth}
                onChange={(e) => setRenewalMonth(e.target.value === "" ? "" : Number(e.target.value))}
                disabled={recurringCycle !== "yearly"}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
              >
                <option value="">未設定</option>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>
                    {m}月
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}
        <label className="block text-sm">
          <FieldLabel>金額</FieldLabel>
          <input
            type="number"
            min="0"
            step="1"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="例: 30000"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            required
          />
        </label>
        {expenseType === "one_time" ? (
          <label className="block text-sm">
            <FieldLabel>支払月</FieldLabel>
            <input
              type="month"
              value={oneTimeMonth}
              onChange={(e) => setOneTimeMonth(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              required
            />
          </label>
        ) : (
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
        )}
        <label className="block text-sm">
          <FieldLabel>メモ（任意）</FieldLabel>
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            rows={2}
            maxLength={2000}
            placeholder="例: レシート番号、店名など"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
        <FormActions
          onCancel={onClose}
          submitting={submitting}
          disabled={
            minorId === "" ||
            paymentId === "" ||
            amount === "" ||
            (expenseType === "one_time" ? !oneTimeMonth : !startMonth)
          }
        />
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
