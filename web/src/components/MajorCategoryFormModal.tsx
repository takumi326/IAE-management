import { useState } from "react"
import { api, type CategoryKind, type MajorCategory } from "../lib/api.ts"
import { apiErrorMessage } from "../lib/errors.ts"
import { FieldLabel, FormActions, FormError, Modal } from "./Modal.tsx"

type Props = {
  onClose: () => void
  onSaved: () => void
  initial?: MajorCategory
}

export function MajorCategoryFormModal({ onClose, onSaved, initial }: Props) {
  const [kind, setKind] = useState<CategoryKind>(initial?.kind ?? "expense")
  const [name, setName] = useState(initial?.name ?? "")
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setErrorMessage(null)
    try {
      if (initial) {
        await api.updateMajorCategory(initial.id, { kind, name: name.trim() })
      } else {
        await api.createMajorCategory({ kind, name: name.trim() })
      }
      onSaved()
    } catch (err) {
      setErrorMessage(apiErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal title={initial ? "大カテゴリを編集" : "大カテゴリを追加"} onClose={onClose} size="sm">
      <form className="space-y-3" onSubmit={onSubmit}>
        <FormError message={errorMessage} />
        <label className="block text-sm">
          <FieldLabel>種別</FieldLabel>
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as CategoryKind)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="expense">支出</option>
            <option value="income">収入</option>
          </select>
        </label>
        <label className="block text-sm">
          <FieldLabel>名前</FieldLabel>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例：食費"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            required
          />
        </label>
        <FormActions onCancel={onClose} submitting={submitting} disabled={!name.trim()} />
      </form>
    </Modal>
  )
}
