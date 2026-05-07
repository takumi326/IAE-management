import { useState } from "react"
import { ActualEditorModal } from "../components/ActualEditorModal.tsx"
import { formatYen, formatYenDelta } from "../lib/format.ts"

const yearlySummary = [
  { month: "2026/04", incomePlan: 350_000, incomeActual: 340_000, expensePlan: 200_000, expenseActual: 190_000, balance: 2_220_000, status: "実" },
  { month: "2026/05", incomePlan: 350_000, incomeActual: 320_000, expensePlan: 200_000, expenseActual: 180_000, balance: 2_345_678, status: "予" },
  { month: "2026/06", incomePlan: 350_000, incomeActual: 0, expensePlan: 210_000, expenseActual: 0, balance: 2_485_678, status: "予" },
]

const expenseBreakdown = [
  { category: "ソシャゲ", amount: 20_000, mode: "実" },
  { category: "サブスク", amount: 5_470, mode: "実" },
  { category: "食費", amount: 45_000, mode: "実" },
  { category: "雑費", amount: 30_000, mode: "予" },
]

const incomeBreakdown = [
  { category: "給与", amount: 320_000, mode: "実" },
  { category: "副収入", amount: 0, mode: "予" },
]

export function DashboardPage() {
  const [month, setMonth] = useState("2026-05")
  const [actualEditorOpen, setActualEditorOpen] = useState(false)

  const expectedBalance = 2_345_678
  const lastMonthDiff = 123_456
  const incomePlan = 350_000
  const incomeActual = 320_000
  const expensePlan = 200_000
  const expenseActual = 180_000

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <button className="rounded-lg border border-slate-300 px-2 py-1 text-sm">{"<"}</button>
            <h2 className="text-xl font-bold">{month.replace("-", "年")}月</h2>
            <button className="rounded-lg border border-slate-300 px-2 py-1 text-sm">{">"}</button>
            <input
              type="month"
              value={month}
              onChange={(event) => setMonth(event.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-1 text-sm"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <button className="rounded-lg border border-slate-300 px-3 py-1.5">今月へ</button>
            <button className="rounded-lg border border-slate-300 px-3 py-1.5">取込</button>
            <button
              type="button"
              onClick={() => setActualEditorOpen(true)}
              className="rounded-lg bg-indigo-600 px-3 py-1.5 font-medium text-white hover:bg-indigo-500"
            >
              ＋ 実績を入力
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <article className="rounded-xl border border-slate-200 bg-indigo-50 p-4">
            <p className="text-xs font-medium text-indigo-700">月末予想残高（予）</p>
            <p className="mt-1 text-2xl font-bold text-indigo-700">{formatYen(expectedBalance)}</p>
            <p className="mt-1 text-xs text-indigo-700">前月比 {formatYenDelta(lastMonthDiff)}</p>
          </article>
          <article className="rounded-xl border border-slate-200 bg-emerald-50 p-4">
            <p className="text-xs font-medium text-emerald-700">収入（予 / 実）</p>
            <p className="mt-1 text-lg font-semibold text-emerald-700">
              {formatYen(incomePlan)} / {formatYen(incomeActual)}
            </p>
          </article>
          <article className="rounded-xl border border-slate-200 bg-rose-50 p-4">
            <p className="text-xs font-medium text-rose-700">支出（予 / 実）</p>
            <p className="mt-1 text-lg font-semibold text-rose-700">
              {formatYen(expensePlan)} / {formatYen(expenseActual)}
            </p>
          </article>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">今年度サマリ（2026/04〜2027/03）</h2>
        </div>
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs text-slate-500">
              <tr>
                <th className="px-3 py-2">月</th>
                <th className="px-3 py-2">収入（予 / 実）</th>
                <th className="px-3 py-2">支出（予 / 実）</th>
                <th className="px-3 py-2">月末残高</th>
                <th className="px-3 py-2">状態</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {yearlySummary.map((row) => (
                <tr key={row.month}>
                  <td className="px-3 py-2 font-medium">{row.month}</td>
                  <td className="px-3 py-2">
                    {formatYen(row.incomePlan)} / {row.incomeActual ? formatYen(row.incomeActual) : "—"}
                  </td>
                  <td className="px-3 py-2">
                    {formatYen(row.expensePlan)} / {row.expenseActual ? formatYen(row.expenseActual) : "—"}
                  </td>
                  <td className="px-3 py-2">{formatYen(row.balance)}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        row.status === "実" ? "bg-slate-200 text-slate-700" : "bg-indigo-100 text-indigo-700"
                      }`}
                    >
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <BreakdownCard title="支出（カテゴリ別）" items={expenseBreakdown} accent="text-rose-600" />
        <BreakdownCard title="収入（カテゴリ別）" items={incomeBreakdown} accent="text-emerald-600" />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold">今月の月末残高</h2>
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="number"
            placeholder="例: 2300000"
            className="w-48 rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <button className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500">保存</button>
        </div>
      </section>

      {actualEditorOpen && <ActualEditorModal month={month} onClose={() => setActualEditorOpen(false)} />}
    </div>
  )
}

type BreakdownItem = { category: string; amount: number; mode: string }

function BreakdownCard({ title, items, accent }: { title: string; items: BreakdownItem[]; accent: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">{title}</h2>
      </div>
      <ul className="divide-y divide-slate-100">
        {items.map((item) => (
          <li key={item.category} className="flex items-center justify-between py-2 text-sm">
            <span>{item.category}</span>
            <div className="flex items-center gap-2">
              <span className={`font-semibold ${accent}`}>{formatYen(item.amount)}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-xs ${
                  item.mode === "実" ? "bg-slate-200 text-slate-700" : "bg-indigo-100 text-indigo-700"
                }`}
              >
                {item.mode}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
