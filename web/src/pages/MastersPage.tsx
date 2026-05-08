import { useCallback, useState } from "react"
import {
  api,
  type IncomeMaster,
  type MajorCategory,
  type MinorCategory,
  type PaymentMethod,
} from "../lib/api.ts"
import { useFetch } from "../lib/useFetch.ts"
import { formatRecurringTypeLabel } from "../lib/labels.ts"

const tabs = [
  { id: "categories", label: "カテゴリ" },
  { id: "payments", label: "支払方法" },
  { id: "expenses", label: "支出" },
  { id: "incomes", label: "収入" },
] as const

type TabId = (typeof tabs)[number]["id"]

export function MastersPage() {
  const [active, setActive] = useState<TabId>("categories")

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">マスタ設定</h2>
          <p className="text-xs text-slate-500">カテゴリ・支払方法・支出・収入を一括で管理</p>
        </div>
        <nav className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActive(tab.id)}
              className={`rounded-full px-3 py-1.5 text-sm ${
                active === tab.id ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </section>

      {active === "categories" && <CategoriesSection />}
      {active === "payments" && <PaymentMethodsSection />}
      {active === "expenses" && <ExpenseMastersSection />}
      {active === "incomes" && <IncomeMastersSection />}
    </div>
  )
}

const KIND_LABEL: Record<number, string> = {
  0: "支出",
  1: "収入",
}

const METHOD_TYPE_LABEL: Record<PaymentMethod["method_type"], string> = {
  card: "カード",
  bank_debit: "口座引落",
}

function CategoriesSection() {
  const loader = useCallback(
    () => Promise.all([api.majorCategories(), api.minorCategories()]),
    [],
  )
  const result = useFetch(loader)

  if (result.status === "loading") return <Loading label="カテゴリを読み込み中…" />
  if (result.status === "error") return <ErrorBox error={result.error} />

  const [majors, minors] = result.data
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Panel title="大カテゴリ" actionLabel="＋ 追加">
        <List
          items={majors}
          empty="大カテゴリが未登録"
          render={(major: MajorCategory) => (
            <li
              key={major.id}
              className="flex items-center justify-between py-2 text-sm"
            >
              <span>{major.name}</span>
              <span className="text-slate-500">{KIND_LABEL[major.kind] ?? major.kind}</span>
            </li>
          )}
        />
      </Panel>
      <Panel title="小カテゴリ" actionLabel="＋ 追加">
        <List
          items={minors}
          empty="小カテゴリが未登録"
          render={(minor: MinorCategory) => (
            <li
              key={minor.id}
              className="flex items-center justify-between py-2 text-sm"
            >
              <span>{minor.name}</span>
              <span className="text-slate-500">{minor.major_category.name}</span>
            </li>
          )}
        />
      </Panel>
    </div>
  )
}

function PaymentMethodsSection() {
  const loader = useCallback(() => api.paymentMethods(), [])
  const result = useFetch(loader)

  if (result.status === "loading") return <Loading label="支払方法を読み込み中…" />
  if (result.status === "error") return <ErrorBox error={result.error} />

  return (
    <Panel title="支払方法" actionLabel="＋ 追加">
      {result.data.length === 0 ? (
        <p className="text-sm text-slate-500">支払方法が未登録</p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {result.data.map((method) => (
            <article key={method.id} className="rounded-lg border border-slate-200 p-3">
              <p className="text-sm font-medium">{method.name}</p>
              <p className="mt-1 text-xs text-slate-500">{METHOD_TYPE_LABEL[method.method_type]}</p>
            </article>
          ))}
        </div>
      )}
    </Panel>
  )
}

function ExpenseMastersSection() {
  const loader = useCallback(
    () => Promise.all([api.expenses(), api.minorCategories(), api.paymentMethods()]),
    [],
  )
  const result = useFetch(loader)

  if (result.status === "loading") return <Loading label="支出マスタを読み込み中…" />
  if (result.status === "error") return <ErrorBox error={result.error} />

  const [expenses, minors, methods] = result.data
  const minorMap = buildMap(minors, (m) => m.id)
  const methodMap = buildMap(methods, (m) => m.id)

  return (
    <Panel title="支出マスタ" actionLabel="＋ 追加">
      <Table
        head={["カテゴリ", "種別", "支払方法", "開始月", "終了月"]}
        rows={expenses.map((row) => [
          formatCategory(minorMap.get(row.minor_category_id)),
          formatRecurringTypeLabel(row.expense_type),
          methodMap.get(row.payment_method_id)?.name ?? "—",
          row.start_month,
          row.end_month ?? "—",
        ])}
        emptyMessage="支出マスタが未登録"
      />
    </Panel>
  )
}

function IncomeMastersSection() {
  const loader = useCallback(
    () => Promise.all([api.incomes(), api.minorCategories()]),
    [],
  )
  const result = useFetch(loader)

  if (result.status === "loading") return <Loading label="収入マスタを読み込み中…" />
  if (result.status === "error") return <ErrorBox error={result.error} />

  const [incomes, minors] = result.data
  const minorMap = buildMap(minors, (m) => m.id)

  return (
    <Panel title="収入マスタ" actionLabel="＋ 追加">
      <Table
        head={["カテゴリ", "種別", "開始月", "終了月"]}
        rows={incomes.map((row: IncomeMaster) => [
          formatCategory(minorMap.get(row.minor_category_id)),
          formatRecurringTypeLabel(row.income_type),
          row.start_month,
          row.end_month ?? "—",
        ])}
        emptyMessage="収入マスタが未登録"
      />
    </Panel>
  )
}

function formatCategory(minor: MinorCategory | undefined): string {
  if (!minor) return "—"
  return `${minor.major_category.name} / ${minor.name}`
}

function buildMap<T, K>(items: T[], keyOf: (item: T) => K): Map<K, T> {
  const map = new Map<K, T>()
  for (const item of items) {
    map.set(keyOf(item), item)
  }
  return map
}

function Panel({ title, actionLabel, children }: { title: string; actionLabel?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-lg font-semibold">{title}</h3>
        {actionLabel && (
          <button className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500">
            {actionLabel}
          </button>
        )}
      </div>
      {children}
    </section>
  )
}

function Table({
  head,
  rows,
  emptyMessage = "データがありません",
}: {
  head: string[]
  rows: (string | number)[][]
  emptyMessage?: string
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-slate-500">{emptyMessage}</p>
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50 text-left text-xs text-slate-500">
          <tr>
            {head.map((label) => (
              <th key={label} className="px-3 py-2">
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j} className="px-3 py-2">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function List<T>({
  items,
  empty,
  render,
}: {
  items: T[]
  empty: string
  render: (item: T) => React.ReactNode
}) {
  if (items.length === 0) {
    return <p className="text-sm text-slate-500">{empty}</p>
  }
  return <ul className="divide-y divide-slate-100">{items.map(render)}</ul>
}

function Loading({ label }: { label: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500 shadow-sm">{label}</div>
  )
}

function ErrorBox({ error }: { error: Error }) {
  return (
    <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700 shadow-sm">
      <p className="font-semibold">読み込みに失敗しました</p>
      <p className="mt-1 text-xs text-rose-600">{error.message}</p>
    </div>
  )
}
