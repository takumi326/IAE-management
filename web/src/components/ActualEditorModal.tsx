type Props = {
  month: string
  onClose: () => void
}

export function ActualEditorModal({ month, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">実績を追加</h3>
          <button type="button" className="text-slate-400 hover:text-slate-600" onClick={onClose}>
            ×
          </button>
        </div>

        <form className="space-y-3">
          <label className="block text-sm">
            <span className="text-slate-600">年月</span>
            <input
              type="month"
              defaultValue={month}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm">
            <span className="text-slate-600">種別</span>
            <select className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
              <option>支出</option>
              <option>収入</option>
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-slate-600">対象マスタ</span>
            <select className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
              <option>食費 / 外食</option>
              <option>サブスク / Netflix</option>
              <option>給与 / 基本給</option>
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-slate-600">金額（正の値）</span>
            <input
              type="number"
              placeholder="例: 3500"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
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
              type="button"
              onClick={onClose}
              className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500"
            >
              保存
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
