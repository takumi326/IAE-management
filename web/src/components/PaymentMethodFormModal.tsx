import { useState } from "react"
import { api, type LedgerChargeTiming, type PaymentMethod, type PaymentMethodType } from "../lib/api.ts"
import { apiErrorMessage } from "../lib/errors.ts"
import { formatPaymentMethodTypeLabel } from "../lib/labels.ts"
import { FieldLabel, FormActions, FormError, Modal } from "./Modal.tsx"

type Props = {
  onClose: () => void
  onSaved: () => void
  initial?: PaymentMethod
}

function defaultLedgerTiming(pm: PaymentMethod | undefined, methodType: PaymentMethodType): LedgerChargeTiming {
  const v = pm?.ledger_charge_timing
  if (v === "same_month" || v === "next_month") {
    return v
  }
  return methodType === "card" ? "next_month" : "same_month"
}

export function PaymentMethodFormModal({ onClose, onSaved, initial }: Props) {
  const initialType = initial?.method_type ?? "card"
  const [name, setName] = useState(initial?.name ?? "")
  const [methodType, setMethodType] = useState<PaymentMethodType>(initialType)
  const [ledgerChargeTiming, setLedgerChargeTiming] = useState<LedgerChargeTiming>(defaultLedgerTiming(initial, initialType))
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setErrorMessage(null)
    try {
      const base = { name: name.trim(), method_type: methodType }
      const payload =
        methodType === "bank_withdrawal"
          ? base
          : { ...base, ledger_charge_timing: ledgerChargeTiming }
      if (initial) {
        await api.updatePaymentMethod(initial.id, payload)
      } else {
        await api.createPaymentMethod(payload)
      }
      onSaved()
    } catch (err) {
      setErrorMessage(apiErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal title={initial ? "支払方法を編集" : "支払方法を追加"} onClose={onClose} size="md">
      <form className="space-y-3" onSubmit={onSubmit}>
        <FormError message={errorMessage} />
        <label className="block text-sm">
          <FieldLabel>名前</FieldLabel>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例：楽天カード / みずほ口座引き落とし"
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
              setLedgerChargeTiming(defaultLedgerTiming(initial, next))
            }}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="card">{formatPaymentMethodTypeLabel("card")}</option>
            <option value="bank_debit">{formatPaymentMethodTypeLabel("bank_debit")}</option>
            <option value="bank_withdrawal">{formatPaymentMethodTypeLabel("bank_withdrawal")}</option>
          </select>
        </label>

        {(methodType === "card" || methodType === "bank_debit") && (
          <fieldset className="space-y-2 rounded-lg border border-slate-200 p-3">
            <legend className="text-xs font-medium text-slate-600">
              {methodType === "card" ? "クレカの実績を載せる月" : "口座引き落としの実績を載せる月"}
            </legend>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="radio"
                name="ledgerChargeTiming"
                checked={ledgerChargeTiming === "next_month"}
                onChange={() => setLedgerChargeTiming("next_month")}
              />
              <span>翌月（引き落としが翌月のとき）</span>
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="radio"
                name="ledgerChargeTiming"
                checked={ledgerChargeTiming === "same_month"}
                onChange={() => setLedgerChargeTiming("same_month")}
              />
              <span>当月（引き落としが当月のとき）</span>
            </label>
          </fieldset>
        )}

        <FormActions onCancel={onClose} submitting={submitting} disabled={!name.trim()} />
      </form>
    </Modal>
  )
}
