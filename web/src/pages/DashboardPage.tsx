import { useState } from "react"
import { ActualEditorModal } from "../components/ActualEditorModal.tsx"
import { ImportModal } from "../components/ImportModal.tsx"
import { ForecastFormModal } from "../components/ForecastFormModal.tsx"
import type { CategoryKind } from "../lib/api.ts"
import { formatYen, formatYenDelta } from "../lib/format.ts"

type Mode = "実" | "予"

type MonthSummary = {
  month: string
  income: { amount: number; mode: Mode }
  expense: { amount: number; mode: Mode }
  balance: { amount: number; mode: Mode }
}

const yearlySummary: MonthSummary[] = [
  {
    month: "2026/04",
    income: { amount: 340_000, mode: "実" },
    expense: { amount: 190_000, mode: "実" },
    balance: { amount: 2_220_000, mode: "実" },
  },
  {
    month: "2026/05",
    income: { amount: 320_000, mode: "実" },
    expense: { amount: 180_000, mode: "実" },
    balance: { amount: 2_345_678, mode: "予" },
  },
  {
    month: "2026/06",
    income: { amount: 350_000, mode: "予" },
    expense: { amount: 210_000, mode: "予" },
    balance: { amount: 2_485_678, mode: "予" },
  },
]

const expenseByCategory: { label: string; amount: number; mode: Mode }[] = [
  { label: "ソシャゲ", amount: 20_000, mode: "実" },
  { label: "サブスク", amount: 5_470, mode: "実" },
  { label: "食費", amount: 45_000, mode: "実" },
  { label: "雑費", amount: 30_000, mode: "予" },
]

const expenseByPayment: { label: string; amount: number; mode: Mode }[] = [
  { label: "PayPayカード", amount: 80_000, mode: "実" },
  { label: "Amazonカード", amount: 35_000, mode: "実" },
  { label: "みずほ口座引落", amount: 65_000, mode: "実" },
]

const incomeByCategory: { label: string; amount: number; mode: Mode }[] = [
  { label: "給与", amount: 320_000, mode: "実" },
  { label: "副収入", amount: 0, mode: "予" },
]

type ForecastTarget = {
  kind: CategoryKind
  month: string
  initialAmount?: number
}

export function DashboardPage() {
  const [month, setMonth] = useState("2026-05")
  const [actualEditorOpen, setActualEditorOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [forecastTarget, setForecastTarget] = useState<ForecastTarget | null>(null)

  const expectedBalance = 2_345_678
  const lastMonthDiff = 123_456
  const incomeAmount = 320_000
  const incomeMode: Mode = "実"
  const expenseAmount = 180_000
  const expenseMode: Mode = "実"

  const openForecast = (target: ForecastTarget) => setForecastTarget(target)
  const closeForecast = () => setForecastTarget(null)

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
            <button
              type="button"
              onClick={() => setActualEditorOpen(true)}
              className="rounded-lg bg-indigo-600 px-3 py-1.5 font-medium text-white hover:bg-indigo-500"
            >
              ＋ 実績を入力
            </button>
            <button
              type="button"
              onClick={() => setImportOpen(true)}
              className="rounded-lg border border-indigo-300 bg-white px-3 py-1.5 font-medium text-indigo-700 hover:bg-indigo-50"
            >
              取込
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <article className="rounded-xl border border-slate-200 bg-indigo-50 p-4">
            <p className="text-xs font-medium text-indigo-700">月末予想残高（予）</p>
            <p className="mt-1 text-2xl font-bold text-indigo-700">{formatYen(expectedBalance)}</p>
            <p className="mt-1 text-xs text-indigo-700">前月比 {formatYenDelta(lastMonthDiff)}</p>
          </article>
          <SummaryCard
            label="収入"
            amount={incomeAmount}
            mode={incomeMode}
            tone="emerald"
            onEditForecast={() => openForecast({ kind: "income", month: monthInputToDate(month), initialAmount: incomeAmount })}
          />
          <SummaryCard
            label="支出"
            amount={expenseAmount}
            mode={expenseMode}
            tone="rose"
            onEditForecast={() => openForecast({ kind: "expense", month: monthInputToDate(month), initialAmount: expenseAmount })}
          />
        </div>
        <p className="mt-2 text-xs text-slate-500">
          各月の <ModeBadge mode="予" /> をクリックすると予測金額を編集できます。
        </p>
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
                <th className="px-3 py-2">収入</th>
                <th className="px-3 py-2">支出</th>
                <th className="px-3 py-2">月末残高</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {yearlySummary.map((row) => (
                <tr key={row.month}>
                  <td className="px-3 py-2 font-medium">{row.month}</td>
                  <td className="px-3 py-2">
                    <ValueWithMode
                      amount={row.income.amount}
                      mode={row.income.mode}
                      onEditForecast={
                        row.income.mode === "予"
                          ? () =>
                              openForecast({
                                kind: "income",
                                month: rowMonthToDate(row.month),
                                initialAmount: row.income.amount,
                              })
                          : undefined
                      }
                    />
                  </td>
                  <td className="px-3 py-2">
                    <ValueWithMode
                      amount={row.expense.amount}
                      mode={row.expense.mode}
                      onEditForecast={
                        row.expense.mode === "予"
                          ? () =>
                              openForecast({
                                kind: "expense",
                                month: rowMonthToDate(row.month),
                                initialAmount: row.expense.amount,
                              })
                          : undefined
                      }
                    />
                  </td>
                  <td className="px-3 py-2">
                    <ValueWithMode amount={row.balance.amount} mode={row.balance.mode} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <ExpenseBreakdownCard />
        <BreakdownCard title="収入" items={incomeByCategory} accent="text-emerald-600" />
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
      {importOpen && <ImportModal onClose={() => setImportOpen(false)} />}
      {forecastTarget && (
        <ForecastFormModal
          kind={forecastTarget.kind}
          month={forecastTarget.month}
          initialAmount={forecastTarget.initialAmount}
          onClose={closeForecast}
          onSaved={closeForecast}
        />
      )}
    </div>
  )
}

const TONE: Record<"emerald" | "rose", { bg: string; text: string }> = {
  emerald: { bg: "bg-emerald-50", text: "text-emerald-700" },
  rose: { bg: "bg-rose-50", text: "text-rose-700" },
}

function SummaryCard({
  label,
  amount,
  mode,
  tone,
  onEditForecast,
}: {
  label: string
  amount: number
  mode: Mode
  tone: "emerald" | "rose"
  onEditForecast?: () => void
}) {
  const t = TONE[tone]
  return (
    <article className={`rounded-xl border border-slate-200 ${t.bg} p-4`}>
      <div className="flex items-center justify-between">
        <p className={`text-xs font-medium ${t.text}`}>{label}</p>
        <ModeBadge mode={mode} onClick={onEditForecast} />
      </div>
      <p className={`mt-1 text-lg font-semibold ${t.text}`}>{formatYen(amount)}</p>
    </article>
  )
}

function ValueWithMode({
  amount,
  mode,
  onEditForecast,
}: {
  amount: number
  mode: Mode
  onEditForecast?: () => void
}) {
  return (
    <span className="inline-flex items-center gap-2">
      <span>{formatYen(amount)}</span>
      <ModeBadge mode={mode} onClick={onEditForecast} />
    </span>
  )
}

function ModeBadge({ mode, onClick }: { mode: Mode; onClick?: () => void }) {
  const className = `rounded-full px-2 py-0.5 text-xs ${
    mode === "実" ? "bg-slate-200 text-slate-700" : "bg-indigo-100 text-indigo-700"
  } ${onClick ? "cursor-pointer hover:bg-indigo-200" : ""}`

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className} aria-label={`${mode}を編集`}>
        {mode}
      </button>
    )
  }
  return <span className={className}>{mode}</span>
}

type BreakdownItem = { label: string; amount: number; mode: Mode }

function ExpenseBreakdownCard() {
  const [view, setView] = useState<"payment" | "category">("payment")
  const items = view === "payment" ? expenseByPayment : expenseByCategory

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">支出</h2>
        <div className="inline-flex rounded-full bg-slate-100 p-0.5 text-xs">
          <BreakdownTab active={view === "payment"} onClick={() => setView("payment")}>
            支払方法別
          </BreakdownTab>
          <BreakdownTab active={view === "category"} onClick={() => setView("category")}>
            カテゴリ別
          </BreakdownTab>
        </div>
      </div>
      <BreakdownList items={items} accent="text-rose-600" />
    </div>
  )
}

function BreakdownCard({ title, items, accent }: { title: string; items: BreakdownItem[]; accent: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">{title}</h2>
      </div>
      <BreakdownList items={items} accent={accent} />
    </div>
  )
}

function BreakdownList({ items, accent }: { items: BreakdownItem[]; accent: string }) {
  if (items.length === 0) {
    return <p className="text-sm text-slate-500">データがありません</p>
  }
  return (
    <ul className="divide-y divide-slate-100">
      {items.map((item) => (
        <li key={item.label} className="flex items-center justify-between py-2 text-sm">
          <span>{item.label}</span>
          <div className="flex items-center gap-2">
            <span className={`font-semibold ${accent}`}>{formatYen(item.amount)}</span>
            <ModeBadge mode={item.mode} />
          </div>
        </li>
      ))}
    </ul>
  )
}

function BreakdownTab({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1 transition-colors ${
        active ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
      }`}
    >
      {children}
    </button>
  )
}

function monthInputToDate(value: string): string {
  return `${value}-01`
}

function rowMonthToDate(rowMonth: string): string {
  // "2026/05" → "2026-05-01"
  return `${rowMonth.replace("/", "-")}-01`
}
