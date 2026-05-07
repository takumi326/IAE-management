const incomes = [
  { category: "給与 / base_salary", type: "recurring", startMonth: "2026-01", endMonth: "-" },
  { category: "給与 / bonus", type: "one_time", startMonth: "2026-06", endMonth: "2026-06" },
]

export function IncomeMastersPage() {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-3 text-lg font-semibold">収入マスタ管理</h2>
      <div className="overflow-hidden rounded-lg border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs text-slate-500">
            <tr>
              <th className="px-3 py-2">カテゴリ</th>
              <th className="px-3 py-2">種別</th>
              <th className="px-3 py-2">開始月</th>
              <th className="px-3 py-2">終了月</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {incomes.map((row) => (
              <tr key={row.category}>
                <td className="px-3 py-2">{row.category}</td>
                <td className="px-3 py-2">{row.type}</td>
                <td className="px-3 py-2">{row.startMonth}</td>
                <td className="px-3 py-2">{row.endMonth}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
