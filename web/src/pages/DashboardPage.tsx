const summaryCards = [
  { label: "予測収入", amount: "¥420,000", tone: "text-emerald-600" },
  { label: "予測支出", amount: "¥285,000", tone: "text-rose-600" },
  { label: "予測収支", amount: "¥135,000", tone: "text-indigo-600" },
  { label: "実績収支", amount: "¥126,800", tone: "text-sky-600" },
]

export function DashboardPage() {
  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-indigo-600">Dashboard</p>
            <h2 className="text-2xl font-bold tracking-tight">収支管理ダッシュボード</h2>
            <p className="text-sm text-slate-500">月次の予測・実績・差分を確認</p>
          </div>
          <input
            type="month"
            defaultValue="2026-05"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-indigo-200 focus:ring"
          />
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((card) => (
            <article key={card.label} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-medium text-slate-500">{card.label}</p>
              <p className={`mt-2 text-xl font-semibold ${card.tone}`}>{card.amount}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
