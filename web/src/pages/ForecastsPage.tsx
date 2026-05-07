const forecastRows = [
  { month: "2026-05", kind: "支出", amount: "¥285,000" },
  { month: "2026-05", kind: "収入", amount: "¥420,000" },
  { month: "2026-06", kind: "支出", amount: "¥292,000" },
]

export function ForecastsPage() {
  return (
    <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold">予測一覧</h2>
        <div className="overflow-hidden rounded-lg border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs text-slate-500">
              <tr>
                <th className="px-3 py-2">月</th>
                <th className="px-3 py-2">区分</th>
                <th className="px-3 py-2">金額</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {forecastRows.map((row) => (
                <tr key={`${row.month}-${row.kind}`}>
                  <td className="px-3 py-2">{row.month}</td>
                  <td className="px-3 py-2">{row.kind}</td>
                  <td className="px-3 py-2 font-medium">{row.amount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold">予測登録</h2>
        <form className="space-y-3">
          <input type="month" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <select className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
            <option>支出</option>
            <option>収入</option>
          </select>
          <input type="number" placeholder="金額" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <button type="button" className="w-full rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white">
            保存
          </button>
        </form>
      </section>
    </div>
  )
}
