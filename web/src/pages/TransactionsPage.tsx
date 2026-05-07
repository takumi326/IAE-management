const transactionRows = [
  { date: "05/02", category: "食費 / UberEats", amount: "-¥2,680", method: "PayPay" },
  { date: "05/10", category: "給与 / base_salary", amount: "+¥380,000", method: "振込" },
]

export function TransactionsPage() {
  return (
    <div className="grid gap-4 xl:grid-cols-[1.7fr_1fr]">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold">実績一覧</h2>
        <div className="overflow-hidden rounded-lg border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs text-slate-500">
              <tr>
                <th className="px-3 py-2">日付</th>
                <th className="px-3 py-2">カテゴリ</th>
                <th className="px-3 py-2">金額</th>
                <th className="px-3 py-2">支払方法</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transactionRows.map((row) => (
                <tr key={`${row.date}-${row.category}`}>
                  <td className="px-3 py-2">{row.date}</td>
                  <td className="px-3 py-2">{row.category}</td>
                  <td className="px-3 py-2 font-medium">{row.amount}</td>
                  <td className="px-3 py-2 text-slate-500">{row.method}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold">実績登録</h2>
        <form className="space-y-3">
          <input type="date" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <select className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
            <option>カテゴリを選択</option>
          </select>
          <input type="number" placeholder="金額" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <button type="button" className="w-full rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white">
            登録
          </button>
        </form>
      </section>
    </div>
  )
}
