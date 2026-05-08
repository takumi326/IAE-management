type Props = {
  onClose: () => void
}

export function ImportModal({ onClose }: Props) {
  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center bg-slate-900/40 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="w-full max-w-xl rounded-2xl bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">実績を取込</h3>
          <button type="button" className="text-slate-400 hover:text-slate-600" onClick={onClose}>
            ×
          </button>
        </div>

        <form className="space-y-4">
          <label className="block text-sm">
            <span className="text-slate-600">JSON</span>
            <textarea
              rows={10}
              placeholder='[{"month":"2026-05","category":"食費","amount":3500,"payment":"PayPay"}]'
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs"
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
              取込実行
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
