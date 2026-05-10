import { useCallback, useEffect, useMemo, useState } from "react"
import { ActualEditorModal } from "../components/ActualEditorModal.tsx"
import { ImportModal } from "../components/ImportModal.tsx"
import { ForecastFormModal } from "../components/ForecastFormModal.tsx"
import { ForecastBulkEditorModal } from "../components/ForecastBulkEditorModal.tsx"
import { MonthlyBalanceFormModal } from "../components/MonthlyBalanceFormModal.tsx"
import {
  api,
  type CategoryKind,
  type DashboardSummary,
  type FiscalActualMonthRow,
  type Forecast,
} from "../lib/api.ts"
import { apiErrorMessage } from "../lib/errors.ts"
import { formatYen, formatYenDelta } from "../lib/format.ts"
import { useFetch } from "../lib/useFetch.ts"

type Mode = "実" | "予"

type MonthSummary = {
  month: string
  income: { amount: number; mode: Mode }
  expense: { amount: number; mode: Mode }
  balance: { amount: number; mode: Mode }
}

type ForecastTarget = {
  kind: CategoryKind
  month: string
  initialAmount?: number
}

export function DashboardPage() {
  const [month, setMonth] = useState(INITIAL_MONTH_INPUT)
  const [actualEditorOpen, setActualEditorOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [forecastTarget, setForecastTarget] = useState<ForecastTarget | null>(null)
  const [bulkEditorOpen, setBulkEditorOpen] = useState(false)
  const [monthEndFormMonth, setMonthEndFormMonth] = useState(INITIAL_MONTH_INPUT)
  const [monthEndBalanceDraft, setMonthEndBalanceDraft] = useState<string | null>(null)
  const [monthEndSaving, setMonthEndSaving] = useState(false)
  const [monthEndError, setMonthEndError] = useState<string | null>(null)
  const [monthlyBalanceModalMonth, setMonthlyBalanceModalMonth] = useState<string | null>(null)

  const forecastState = useFetch<Forecast[]>(() => api.forecasts())
  const dashboardLoader = useCallback(() => api.dashboard(monthInputToDate(month)), [month])
  const dashboardState = useFetch(dashboardLoader)
  const monthEndDashboardLoader = useCallback(
    () => api.dashboard(monthInputToDate(monthEndFormMonth)),
    [monthEndFormMonth],
  )
  const monthEndDashboardState = useFetch(monthEndDashboardLoader)
  const fiscalActualsLoader = useCallback(
    () => api.fiscalActuals(monthInputToDate(month)),
    [month],
  )
  const fiscalActualsState = useFetch(fiscalActualsLoader)

  const openForecast = (target: ForecastTarget) => setForecastTarget(target)
  const closeForecast = () => setForecastTarget(null)
  const setMonthWithReset = (nextMonth: string) => {
    setMonth(nextMonth)
    setMonthEndBalanceDraft(null)
  }
  const onForecastSaved = () => {
    closeForecast()
    forecastState.refetch()
    fiscalActualsState.refetch()
  }

  useEffect(() => {
    void (async () => {
      await api.syncActuals()
      fiscalActualsState.refetch()
      dashboardState.refetch()
    })()
  }, [])

  const fetchedMonthEndBalanceInput =
    monthEndDashboardState.status === "success"
      ? String(toNumber(monthEndDashboardState.data.monthly_balance))
      : ""
  const monthEndBalanceInput = monthEndBalanceDraft ?? fetchedMonthEndBalanceInput

  const selectedMonth = monthInputToDate(month)
  const fiscalMonths = useMemo(() => buildFiscalMonths(selectedMonth), [selectedMonth])
  const forecastsByKey = useMemo(() => toForecastMap(forecastState.status === "success" ? forecastState.data : []), [forecastState])

  const fiscalActualsByMonth = useMemo(() => {
    const map = new Map<string, FiscalActualMonthRow>()
    if (fiscalActualsState.status !== "success") return map
    for (const row of fiscalActualsState.data) {
      const key = normalizeMonthKey(row.month)
      map.set(key, row)
    }
    return map
  }, [fiscalActualsState])

  const yearlySummary: MonthSummary[] = useMemo(
    () =>
      fiscalMonths.reduce<MonthSummary[]>((rows, m) => {
        const act = fiscalActualsByMonth.get(m)
        const forecastIncome = forecastsByKey.get(keyOf("income", m)) ?? 0
        const forecastExpense = forecastsByKey.get(keyOf("expense", m)) ?? 0
        const useIncomeActual = act?.has_income_actual ?? false
        const useExpenseActual = act?.has_expense_actual ?? false
        const income = useIncomeActual ? toNumber(act!.income_actual) : forecastIncome
        const expense = useExpenseActual ? toNumber(act!.expense_actual) : forecastExpense
        const incomeMode: Mode = useIncomeActual ? "実" : "予"
        const expenseMode: Mode = useExpenseActual ? "実" : "予"
        const previousBalance = rows.length > 0 ? rows[rows.length - 1].balance.amount : 0
        const nextBalance = previousBalance + income - expense
        const balanceMode: Mode = act?.has_monthly_balance ? "実" : "予"
        rows.push({
          month: dateToRowMonth(m),
          income: { amount: income, mode: incomeMode },
          expense: { amount: expense, mode: expenseMode },
          balance: { amount: nextBalance, mode: balanceMode },
        })
        return rows
      }, []),
    [fiscalMonths, forecastsByKey, fiscalActualsByMonth],
  )

  const monthIncome = forecastsByKey.get(keyOf("income", selectedMonth)) ?? 0
  const monthExpense = forecastsByKey.get(keyOf("expense", selectedMonth)) ?? 0
  const selectedIdx = fiscalMonths.findIndex((m) => m === selectedMonth)
  const selectedMonthRow = selectedIdx >= 0 ? yearlySummary[selectedIdx] : null
  const summaryIncomeAmount = selectedMonthRow?.income.amount ?? monthIncome
  const summaryExpenseAmount = selectedMonthRow?.expense.amount ?? monthExpense
  const summaryIncomeMode = selectedMonthRow?.income.mode ?? "予"
  const summaryExpenseMode = selectedMonthRow?.expense.mode ?? "予"
  const expectedBalance =
    selectedIdx >= 0 ? yearlySummary[selectedIdx].balance.amount : monthIncome - monthExpense
  const previousBalance = selectedIdx > 0 ? yearlySummary[selectedIdx - 1].balance.amount : 0
  const lastMonthDiff = expectedBalance - previousBalance

  const saveMonthEndBalance = async () => {
    const amount = Number(monthEndBalanceInput)
    if (!Number.isFinite(amount) || amount < 0) {
      setMonthEndError("月末残高は0以上の数字で入力してください")
      return
    }
    setMonthEndSaving(true)
    setMonthEndError(null)
    try {
      await api.upsertMonthlyBalance({ month: monthInputToDate(monthEndFormMonth), amount: Math.round(amount) })
      setMonthEndBalanceDraft(null)
      dashboardState.refetch()
      monthEndDashboardState.refetch()
      fiscalActualsState.refetch()
    } catch (error) {
      setMonthEndError(apiErrorMessage(error))
    } finally {
      setMonthEndSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="rounded-lg border border-slate-300 px-2 py-1 text-sm"
              onClick={() => setMonthWithReset(addMonthsToMonthInput(month, -1))}
            >
              {"<"}
            </button>
            <h2 className="text-xl font-bold">{month.replace("-", "年")}月</h2>
            <button
              type="button"
              className="rounded-lg border border-slate-300 px-2 py-1 text-sm"
              onClick={() => setMonthWithReset(addMonthsToMonthInput(month, 1))}
            >
              {">"}
            </button>
            <button
              type="button"
              className="rounded-lg border border-slate-300 px-3 py-1 text-sm"
              onClick={() => {
                setMonthWithReset(INITIAL_MONTH_INPUT)
              }}
            >
              今月へ
            </button>
            <input
              type="month"
              value={month}
              onChange={(event) => setMonthWithReset(event.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-1 text-sm"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <button
              type="button"
              onClick={() => setActualEditorOpen(true)}
              className="rounded-lg bg-indigo-600 px-3 py-1.5 font-medium text-white hover:bg-indigo-500"
            >
              ＋ 単発の支出を追加
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
            amount={summaryIncomeAmount}
            mode={summaryIncomeMode}
            tone="emerald"
            onEditForecast={
              summaryIncomeMode === "予"
                ? () => openForecast({ kind: "income", month: selectedMonth, initialAmount: monthIncome })
                : undefined
            }
          />
          <SummaryCard
            label="支出"
            amount={summaryExpenseAmount}
            mode={summaryExpenseMode}
            tone="rose"
            onEditForecast={
              summaryExpenseMode === "予"
                ? () => openForecast({ kind: "expense", month: selectedMonth, initialAmount: monthExpense })
                : undefined
            }
          />
        </div>
        <p className="mt-2 text-xs text-slate-500">
          各月の <ModeBadge mode="予" /> をクリックすると予測金額を編集できます。
          <ModeBadge mode="実" /> はその月に実績取引（定期の自動生成・単発・取込など）がある列です。
          今年度サマリの月末残高のバッジをクリックすると、その月の月末残高を編集できます。
        </p>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="min-w-0 flex-1 text-lg font-semibold">
            今年度サマリ（{dateToRowMonth(fiscalMonths[0])}〜{dateToRowMonth(fiscalMonths[fiscalMonths.length - 1])}）
          </h2>
          <button
            type="button"
            onClick={() => setBulkEditorOpen(true)}
            className="shrink-0 rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
          >
            予測をまとめて編集
          </button>
        </div>
        {forecastState.status === "error" && (
          <p className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            予測の読み込みに失敗しました: {apiErrorMessage(forecastState.error)}
          </p>
        )}
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
                                initialAmount: forecastsByKey.get(keyOf("income", rowMonthToDate(row.month))) ?? 0,
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
                                initialAmount: forecastsByKey.get(keyOf("expense", rowMonthToDate(row.month))) ?? 0,
                              })
                          : undefined
                      }
                    />
                  </td>
                  <td className="px-3 py-2">
                    <ValueWithMode
                      amount={row.balance.amount}
                      mode={row.balance.mode}
                      onMonthlyBalanceEdit={() => {
                        const iso = rowMonthToDate(row.month)
                        setMonthEndFormMonth(iso.slice(0, 7))
                        setMonthEndBalanceDraft(null)
                        setMonthlyBalanceModalMonth(iso)
                      }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <ExpenseBreakdownCard state={dashboardState} expenseMode={summaryExpenseMode} />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-2 text-lg font-semibold">月末残高の作成</h2>
        <p className="mb-3 text-xs text-slate-500">
          対象月を選んで保存します。今年度サマリの月末残高バッジから開いても同じです。
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-slate-600">対象月</span>
            <input
              type="month"
              value={monthEndFormMonth}
              onChange={(event) => {
                setMonthEndFormMonth(event.target.value)
                setMonthEndBalanceDraft(null)
              }}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
            />
          </label>
          <input
            type="number"
            min="0"
            placeholder={monthEndDashboardState.status === "loading" ? "読み込み中…" : "例: 2300000"}
            value={monthEndBalanceInput}
            onChange={(event) => setMonthEndBalanceDraft(event.target.value)}
            disabled={monthEndDashboardState.status !== "success"}
            className="w-48 rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50"
          />
          <button
            type="button"
            onClick={() => void saveMonthEndBalance()}
            disabled={monthEndSaving || monthEndDashboardState.status !== "success"}
            className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-indigo-300"
          >
            {monthEndSaving ? "保存中…" : "保存"}
          </button>
        </div>
        {monthEndError && <p className="mt-2 text-sm text-rose-700">{monthEndError}</p>}
      </section>

      {actualEditorOpen && (
        <ActualEditorModal
          key={month}
          month={month}
          onClose={() => setActualEditorOpen(false)}
          onSaved={() => {
            setActualEditorOpen(false)
            dashboardState.refetch()
            fiscalActualsState.refetch()
          }}
        />
      )}
      {importOpen && (
        <ImportModal
          onClose={() => setImportOpen(false)}
          onImported={() => {
            setImportOpen(false)
            dashboardState.refetch()
            fiscalActualsState.refetch()
            forecastState.refetch()
          }}
        />
      )}
      {forecastTarget && (
        <ForecastFormModal
          kind={forecastTarget.kind}
          month={forecastTarget.month}
          initialAmount={forecastTarget.initialAmount}
          onClose={closeForecast}
          onSaved={onForecastSaved}
        />
      )}
      {monthlyBalanceModalMonth && (
        <MonthlyBalanceFormModal
          key={monthlyBalanceModalMonth}
          month={monthlyBalanceModalMonth}
          onClose={() => setMonthlyBalanceModalMonth(null)}
          onSaved={() => {
            setMonthlyBalanceModalMonth(null)
            setMonthEndBalanceDraft(null)
            fiscalActualsState.refetch()
            monthEndDashboardState.refetch()
            dashboardState.refetch()
          }}
        />
      )}
      {bulkEditorOpen && (
        <ForecastBulkEditorModal
          startMonth={monthInputToDate(INITIAL_MONTH_INPUT)}
          forecasts={forecastState.status === "success" ? forecastState.data : []}
          onClose={() => setBulkEditorOpen(false)}
          onSaved={() => {
            setBulkEditorOpen(false)
            forecastState.refetch()
          }}
        />
      )}
    </div>
  )
}

const INITIAL_MONTH_INPUT = toMonthInput(Date.now())

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
  onMonthlyBalanceEdit,
}: {
  amount: number
  mode: Mode
  onEditForecast?: () => void
  onMonthlyBalanceEdit?: () => void
}) {
  const onBadgeClick = onMonthlyBalanceEdit ?? onEditForecast
  return (
    <span className="inline-flex items-center gap-2">
      <span>{formatYen(amount)}</span>
      <ModeBadge mode={mode} onClick={onBadgeClick} />
    </span>
  )
}

function ModeBadge({ mode, onClick }: { mode: Mode; onClick?: () => void }) {
  const hover =
    onClick && mode === "実" ? "cursor-pointer hover:bg-slate-300" : onClick ? "cursor-pointer hover:bg-indigo-200" : ""
  const className = `rounded-full px-2 py-0.5 text-xs ${
    mode === "実" ? "bg-slate-200 text-slate-700" : "bg-indigo-100 text-indigo-700"
  } ${hover}`

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

function ExpenseBreakdownCard({
  state,
  expenseMode,
}: {
  state: {
    status: "loading" | "success" | "error"
    data: DashboardSummary | null
    error: Error | null
  }
  /** 選択月の支出サマリと同じ「予／実」（内訳バッジを揃える） */
  expenseMode: Mode
}) {
  const [view, setView] = useState<"payment" | "category">("payment")
  const dashboard = state.status === "success" ? state.data : null
  const paymentItems = dashboard
    ? dashboard.expense_by_payment.map((item) => ({ label: item.label, amount: toNumber(item.amount), mode: item.mode as Mode }))
    : []
  const categoryGroups: LocalCategoryBreakdownGroup[] = dashboard
    ? dashboard.expense_by_category_groups.map((group) => ({
        major: group.major,
        mode: group.mode as Mode,
        minors: group.minors.map((minor) => ({
          label: minor.label,
          amount: toNumber(minor.amount),
          mode: minor.mode as Mode,
        })),
      }))
    : []
  const hasBreakdownRows = paymentItems.length > 0 || categoryGroups.length > 0

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
      {state.status === "loading" && <p className="text-sm text-slate-500">読み込み中…</p>}
      {state.status === "error" && (
        <p className="text-sm text-rose-700">内訳の読み込みに失敗しました: {apiErrorMessage(state.error)}</p>
      )}
      {state.status === "success" &&
        (view === "payment" ? (
          <BreakdownList items={paymentItems} accent="text-rose-600" badgeMode={expenseMode} />
        ) : (
          <CategoryBreakdownList groups={categoryGroups} badgeMode={expenseMode} />
        ))}
      {state.status === "success" && dashboard && !hasBreakdownRows && (
        <p className="mt-2 text-xs text-slate-500">
          {expenseMode === "予"
            ? "この月は実績ベースの支出内訳がまだありません。上部の支出合計は予測です。"
            : "実績取引はある設定ですが、内訳を表示できませんでした。"}
        </p>
      )}
    </div>
  )
}

type LocalCategoryBreakdownGroup = {
  major: string
  mode: Mode
  minors: BreakdownItem[]
}

function CategoryBreakdownList({ groups, badgeMode }: { groups: LocalCategoryBreakdownGroup[]; badgeMode: Mode }) {
  if (groups.length === 0) {
    return <p className="text-sm text-slate-500">データがありません</p>
  }

  return (
    <ul className="space-y-2">
      {groups.map((group) => {
        const total = group.minors.reduce((sum, minor) => sum + minor.amount, 0)
        return (
          <li key={group.major} className="rounded-lg border border-slate-200">
            <details open className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2 text-sm">
                <span className="font-medium">{group.major}</span>
                <span className="inline-flex items-center gap-2">
                  <span className="font-semibold text-rose-600">{formatYen(total)}</span>
                  <ModeBadge mode={badgeMode} />
                </span>
              </summary>
              <ul className="border-t border-slate-100">
                {group.minors.map((minor) => (
                  <li key={`${group.major}-${minor.label}`} className="flex items-center justify-between px-3 py-2 text-sm">
                    <span className="text-slate-700">{minor.label}</span>
                    <span className="inline-flex items-center gap-2">
                      <span className="font-semibold text-rose-600">{formatYen(minor.amount)}</span>
                      <ModeBadge mode={badgeMode} />
                    </span>
                  </li>
                ))}
              </ul>
            </details>
          </li>
        )
      })}
    </ul>
  )
}

function BreakdownList({ items, accent, badgeMode }: { items: BreakdownItem[]; accent: string; badgeMode: Mode }) {
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
            <ModeBadge mode={badgeMode} />
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

function toMonthInput(value: number): string {
  const d = new Date(value)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  return `${y}-${m}`
}

function addMonthsToMonthInput(monthInput: string, deltaMonths: number): string {
  const [yRaw, mRaw] = monthInput.split("-")
  const y = Number(yRaw)
  const m0 = Number(mRaw) - 1 // 0-based
  const d = new Date(y, m0, 1)
  d.setMonth(d.getMonth() + deltaMonths)
  const yy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  return `${yy}-${mm}`
}

function buildFiscalMonths(selectedMonth: string): string[] {
  const [y, m] = selectedMonth.split("-").map(Number)
  const fiscalYear = m >= 4 ? y : y - 1
  const months: string[] = []
  for (let i = 0; i < 12; i += 1) {
    const date = new Date(fiscalYear, 3 + i, 1)
    const yy = date.getFullYear()
    const mm = String(date.getMonth() + 1).padStart(2, "0")
    months.push(`${yy}-${mm}-01`)
  }
  return months
}

function keyOf(kind: CategoryKind, month: string): string {
  return `${kind}:${month}`
}

function toForecastMap(forecasts: Forecast[]): Map<string, number> {
  const map = new Map<string, number>()
  forecasts.forEach((f) => {
    const amount = toNumber(f.amount)
    map.set(keyOf(f.kind, normalizeMonthKey(String(f.month))), Number.isFinite(amount) ? amount : 0)
  })
  return map
}

function toNumber(value: string | number): number {
  const n = typeof value === "string" ? Number(value) : value
  return Number.isFinite(n) ? n : 0
}

function dateToRowMonth(date: string): string {
  const [y, m] = date.split("-")
  return `${y}/${m}`
}

/** API の month と fiscalMonths のキーを揃える（YYYY-MM-DD または ISO日時） */
function normalizeMonthKey(month: string): string {
  const s = String(month).trim()
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(s)
  if (match) {
    const [, y, mo] = match
    return `${y}-${mo}-01`
  }
  const d = new Date(s)
  if (!Number.isNaN(d.getTime())) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`
  }
  const head = s.slice(0, 10)
  const [y, mo] = head.split("-")
  if (!y || !mo) return s
  return `${y}-${mo.padStart(2, "0")}-01`
}
