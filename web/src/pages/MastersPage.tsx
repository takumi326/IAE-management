import { useState } from "react"
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

function CategoriesSection() {
  const majors = [
    { kind: "支出", name: "食費" },
    { kind: "支出", name: "サブスク" },
    { kind: "支出", name: "雑費" },
    { kind: "収入", name: "給与" },
  ]
  const minors = [
    { major: "食費", name: "外食" },
    { major: "食費", name: "UberEats" },
    { major: "サブスク", name: "Netflix" },
    { major: "給与", name: "基本給" },
  ]

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Panel title="大カテゴリ" actionLabel="＋ 追加">
        <ul className="divide-y divide-slate-100">
          {majors.map((row) => (
            <li key={`${row.kind}-${row.name}`} className="flex items-center justify-between py-2 text-sm">
              <span>{row.name}</span>
              <span className="text-slate-500">{row.kind}</span>
            </li>
          ))}
        </ul>
      </Panel>
      <Panel title="小カテゴリ" actionLabel="＋ 追加">
        <ul className="divide-y divide-slate-100">
          {minors.map((row) => (
            <li key={`${row.major}-${row.name}`} className="flex items-center justify-between py-2 text-sm">
              <span>{row.name}</span>
              <span className="text-slate-500">{row.major}</span>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  )
}

function PaymentMethodsSection() {
  const methods = [
    { name: "PayPayカード", type: "カード" },
    { name: "Amazonカード", type: "カード" },
    { name: "みずほ口座引落", type: "口座引落" },
  ]

  return (
    <Panel title="支払方法" actionLabel="＋ 追加">
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {methods.map((method) => (
          <article key={method.name} className="rounded-lg border border-slate-200 p-3">
            <p className="text-sm font-medium">{method.name}</p>
            <p className="mt-1 text-xs text-slate-500">{method.type}</p>
          </article>
        ))}
      </div>
    </Panel>
  )
}

function ExpenseMastersSection() {
  const rows = [
    { category: "食費 / 外食", type: "one_time", payment: "PayPayカード", startMonth: "2026-01", endMonth: "—" },
    { category: "サブスク / Netflix", type: "recurring", payment: "Amazonカード", startMonth: "2026-01", endMonth: "—" },
    { category: "保険 / 生命保険", type: "recurring", payment: "みずほ口座引落", startMonth: "2025-04", endMonth: "—" },
  ]

  return (
    <Panel title="支出マスタ" actionLabel="＋ 追加">
      <Table
        head={["カテゴリ", "種別", "支払方法", "開始月", "終了月"]}
        rows={rows.map((row) => [
          row.category,
          formatRecurringTypeLabel(row.type),
          row.payment,
          row.startMonth,
          row.endMonth,
        ])}
      />
    </Panel>
  )
}

function IncomeMastersSection() {
  const rows = [
    { category: "給与 / 基本給", type: "recurring", startMonth: "2026-01", endMonth: "—" },
    { category: "給与 / 賞与", type: "one_time", startMonth: "2026-06", endMonth: "2026-06" },
  ]

  return (
    <Panel title="収入マスタ" actionLabel="＋ 追加">
      <Table
        head={["カテゴリ", "種別", "開始月", "終了月"]}
        rows={rows.map((row) => [row.category, formatRecurringTypeLabel(row.type), row.startMonth, row.endMonth])}
      />
    </Panel>
  )
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

function Table({ head, rows }: { head: string[]; rows: (string | number)[][] }) {
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
