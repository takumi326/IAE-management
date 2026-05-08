import { useState } from "react"
import { api, type PaymentMethodType } from "../lib/api.ts"
import { apiErrorMessage } from "../lib/errors.ts"
import { formatPaymentMethodTypeLabel } from "../lib/labels.ts"
import { FieldLabel, FormActions, FormError, Modal } from "./Modal.tsx"

const DAY_OPTIONS = Array.from({ length: 31 }, (_, i) => i + 1)

type Props = {
  onClose: () => void
  onCreated: () => void
}

function daySelectValue(day: number | null): string {
  return day == null ? "" : String(day)
}

export function PaymentMethodFormModal({ onClose, onCreated }: Props) {
  const [name, setName] = useState("")
  const [methodType, setMethodType] = useState<PaymentMethodType>("card")
  const [closingDay, setClosingDay] = useState<number | null>(null)
  const [debitDay, setDebitDay] = useState<number | null>(27)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setErrorMessage(null)
    try {
      await api.createPaymentMethod({
        name: name.trim(),
        method_type: methodType,
        closing_day: methodType === "card" ? closingDay : null,
        debit_day: debitDay,
      })
      onCreated()
    } catch (err) {
      setErrorMessage(apiErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal title="支払方法を追加" onClose={onClose} size="md">
      <form className="space-y-3" onSubmit={onSubmit}>
        <FormError message={errorMessage} />
        <label className="block text-sm">
          <FieldLabel>名前</FieldLabel>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例：楽天カード / みずほ口座引落"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            required
          />
        </label>
        <label className="block text-sm">
          <FieldLabel>種別</FieldLabel>
          <select
            value={methodType}
            onChange={(e) => {
              const next = e.target.value as PaymentMethodType
              setMethodType(next)
              if (next === "bank_debit") {
                setClosingDay(null)
                if (debitDay == null) setDebitDay(1)
              } else if (next === "bank_withdrawal") {
                setClosingDay(null)
                setDebitDay(null)
              } else {
                if (debitDay == null) setDebitDay(27)
              }
            }}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="card">{formatPaymentMethodTypeLabel("card")}</option>
            <option value="bank_debit">{formatPaymentMethodTypeLabel("bank_debit")}</option>
            <option value="bank_withdrawal">{formatPaymentMethodTypeLabel("bank_withdrawal")}</option>
          </select>
        </label>

        {methodType === "card" && (
          <>
            <label className="block text-sm">
              <FieldLabel>締め日</FieldLabel>
              <select
                value={daySelectValue(closingDay)}
                onChange={(e) => {
                  const v = e.target.value
                  setClosingDay(v === "" ? null : Number(v))
                }}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">月末</option>
                {DAY_OPTIONS.map((d) => (
                  <option key={d} value={d}>
                    {d}日
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <FieldLabel>引き落とし日（締めの翌月）</FieldLabel>
              <select
                value={daySelectValue(debitDay)}
                onChange={(e) => {
                  const v = e.target.value
                  setDebitDay(v === "" ? null : Number(v))
                }}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">未設定</option>
                {DAY_OPTIONS.map((d) => (
                  <option key={d} value={d}>
                    翌月{d}日
                  </option>
                ))}
              </select>
            </label>
          </>
        )}

        {methodType === "bank_debit" && (
          <label className="block text-sm">
            <FieldLabel>引き落とし日（当月）</FieldLabel>
            <select
              value={daySelectValue(debitDay)}
              onChange={(e) => {
                const v = e.target.value
                setDebitDay(v === "" ? null : Number(v))
              }}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">未設定</option>
              {DAY_OPTIONS.map((d) => (
                <option key={d} value={d}>
                  毎月{d}日
                </option>
              ))}
            </select>
          </label>
        )}

        <FormActions onCancel={onClose} submitting={submitting} disabled={!name.trim()} />
      </form>
    </Modal>
  )
}
