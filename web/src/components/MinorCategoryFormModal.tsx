import { useMemo, useState } from "react"
import { api, type MajorCategory, type MinorCategory } from "../lib/api.ts"
import { sortMajorCategories } from "../lib/categorySort.ts"
import { apiErrorMessage } from "../lib/errors.ts"
import { FieldLabel, FormActions, FormError, Modal } from "./Modal.tsx"

type Props = {
  onClose: () => void
  onSaved: () => void
  majors: MajorCategory[]
  initial?: MinorCategory
}

export function MinorCategoryFormModal({ onClose, onSaved, majors, initial }: Props) {
  const majorsSorted = useMemo(() => sortMajorCategories(majors), [majors])
  const [majorId, setMajorId] = useState<number | "">(
    initial?.major_category.id ?? majorsSorted[0]?.id ?? "",
  )
  const [name, setName] = useState(initial?.name ?? "")
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (majorId === "") return
    setSubmitting(true)
    setErrorMessage(null)
    try {
      if (initial) {
        await api.updateMinorCategory(initial.id, { major_category_id: Number(majorId), name: name.trim() })
      } else {
        await api.createMinorCategory({ major_category_id: Number(majorId), name: name.trim() })
      }
      onSaved()
    } catch (err) {
      setErrorMessage(apiErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal title={initial ? "小カテゴリを編集" : "小カテゴリを追加"} onClose={onClose} size="sm">
      <form className="space-y-3" onSubmit={onSubmit}>
        <FormError message={errorMessage} />
        <label className="block text-sm">
          <FieldLabel>大カテゴリ</FieldLabel>
          <select
            value={majorId}
            onChange={(e) => setMajorId(e.target.value === "" ? "" : Number(e.target.value))}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            required
          >
            {majorsSorted.length === 0 && <option value="">先に大カテゴリを登録してください</option>}
            {majorsSorted.map((m) => (
              <option key={m.id} value={m.id}>
                {m.kind === "expense" ? "支出" : "収入"} / {m.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <FieldLabel>名前</FieldLabel>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例：外食"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            required
          />
        </label>
        <FormActions
          onCancel={onClose}
          submitting={submitting}
          disabled={!name.trim() || majorId === ""}
        />
      </form>
    </Modal>
  )
}
