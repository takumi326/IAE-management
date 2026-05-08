import { useCallback, useState } from "react"
import {
  api,
  type CategoryKind,
  type IncomeMaster,
  type MajorCategory,
  type MinorCategory,
} from "../lib/api.ts"
import { useFetch } from "../lib/useFetch.ts"
import { formatPaymentMethodSchedule, formatPaymentMethodTypeLabel, formatRecurringTypeLabel } from "../lib/labels.ts"
import { MajorCategoryFormModal } from "../components/MajorCategoryFormModal.tsx"
import { MinorCategoryFormModal } from "../components/MinorCategoryFormModal.tsx"
import { PaymentMethodFormModal } from "../components/PaymentMethodFormModal.tsx"
import { ExpenseMasterFormModal } from "../components/ExpenseMasterFormModal.tsx"
import { IncomeMasterFormModal } from "../components/IncomeMasterFormModal.tsx"

const tabs = [
  { id: "expenses", label: "支出" },
  { id: "incomes", label: "収入" },
  { id: "categories", label: "カテゴリ" },
  { id: "payments", label: "支払方法" },
] as const

type TabId = (typeof tabs)[number]["id"]

export function MastersPage() {
  const [active, setActive] = useState<TabId>("expenses")

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-xl font-bold">マスタ設定</h2>
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

const KIND_LABEL: Record<CategoryKind, string> = {
  expense: "支出",
  income: "収入",
}

function toKindLabel(kind: string): string {
  if (kind === "expense") return KIND_LABEL.expense
  if (kind === "income") return KIND_LABEL.income
  return "不明"
}

function CategoriesSection() {
  const loader = useCallback(
    () => Promise.all([api.majorCategories(), api.minorCategories()]),
    [],
  )
  const result = useFetch(loader)
  const [openModal, setOpenModal] = useState<"major" | "minor" | null>(null)
  const [editingMajor, setEditingMajor] = useState<MajorCategory | null>(null)
  const [editingMinor, setEditingMinor] = useState<MinorCategory | null>(null)

  if (result.status === "loading") return <Loading label="カテゴリを読み込み中…" />
  if (result.status === "error") return <ErrorBox error={result.error} />

  const [majors, minors] = result.data
  const handleSaved = () => {
    setOpenModal(null)
    setEditingMajor(null)
    setEditingMinor(null)
    result.refetch()
  }

  const minorsByMajorId = new Map<number, MinorCategory[]>()
  for (const minor of minors) {
    const group = minorsByMajorId.get(minor.major_category.id)
    if (group) {
      group.push(minor)
    } else {
      minorsByMajorId.set(minor.major_category.id, [minor])
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-lg font-semibold">カテゴリ</h3>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setOpenModal("major")}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
          >
            ＋ 大カテゴリ
          </button>
          <button
            type="button"
            onClick={() => setOpenModal("minor")}
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500"
          >
            ＋ 小カテゴリ
          </button>
        </div>
      </div>

      {majors.length === 0 ? (
        <p className="text-sm text-slate-500">大カテゴリが未登録</p>
      ) : (
        <ul className="space-y-2">
          {majors.map((major: MajorCategory) => {
            const majorMinors = minorsByMajorId.get(major.id) ?? []
            return (
              <li key={major.id} className="rounded-lg border border-slate-200">
                <details open className="group">
                  <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2 text-sm">
                    <span className="font-medium">{major.name}</span>
                    <span className="flex items-center gap-2 text-xs text-slate-500">
                      <span>{toKindLabel(major.kind)}</span>
                      <span>{majorMinors.length}件</span>
                      <button
                        type="button"
                        className="rounded border border-slate-300 px-1.5 py-0.5 text-xs hover:bg-slate-100"
                        onClick={(e) => {
                          e.preventDefault()
                          setEditingMajor(major)
                        }}
                      >
                        編集
                      </button>
                    </span>
                  </summary>
                  <div className="border-t border-slate-100 px-3 py-2">
                    {majorMinors.length === 0 ? (
                      <p className="text-xs text-slate-400">小カテゴリなし</p>
                    ) : (
                      <ul className="space-y-1">
                        {majorMinors.map((minor) => (
                          <li key={minor.id} className="flex items-center justify-between rounded bg-slate-50 px-2 py-1 text-sm text-slate-700">
                            <span>{minor.name}</span>
                            <button
                              type="button"
                              className="rounded border border-slate-300 px-1.5 py-0.5 text-xs hover:bg-white"
                              onClick={() => setEditingMinor(minor)}
                            >
                              編集
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </details>
              </li>
            )
          })}
        </ul>
      )}

      {openModal === "major" && (
        <MajorCategoryFormModal onClose={() => setOpenModal(null)} onSaved={handleSaved} />
      )}
      {openModal === "minor" && (
        <MinorCategoryFormModal
          onClose={() => setOpenModal(null)}
          onSaved={handleSaved}
          majors={majors}
        />
      )}
      {editingMajor && (
        <MajorCategoryFormModal onClose={() => setEditingMajor(null)} onSaved={handleSaved} initial={editingMajor} />
      )}
      {editingMinor && (
        <MinorCategoryFormModal
          onClose={() => setEditingMinor(null)}
          onSaved={handleSaved}
          majors={majors}
          initial={editingMinor}
        />
      )}
    </section>
  )
}

function PaymentMethodsSection() {
  const loader = useCallback(() => api.paymentMethods(), [])
  const result = useFetch(loader)
  const [open, setOpen] = useState(false)

  if (result.status === "loading") return <Loading label="支払方法を読み込み中…" />
  if (result.status === "error") return <ErrorBox error={result.error} />

  const handleCreated = () => {
    setOpen(false)
    result.refetch()
  }

  return (
    <Panel title="支払方法" actionLabel="＋ 追加" onAction={() => setOpen(true)}>
      {result.data.length === 0 ? (
        <p className="text-sm text-slate-500">支払方法が未登録</p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {result.data.map((method) => (
            <article key={method.id} className="rounded-lg border border-slate-200 p-3">
              <p className="text-sm font-medium">{method.name}</p>
              <p className="mt-1 text-xs text-slate-600">{formatPaymentMethodTypeLabel(method.method_type)}</p>
              <p className="mt-0.5 text-xs text-slate-500">{formatPaymentMethodSchedule(method)}</p>
            </article>
          ))}
        </div>
      )}
      {open && <PaymentMethodFormModal onClose={() => setOpen(false)} onCreated={handleCreated} />}
    </Panel>
  )
}

function ExpenseMastersSection() {
  const loader = useCallback(
    () => Promise.all([api.expenses(), api.minorCategories(), api.paymentMethods()]),
    [],
  )
  const result = useFetch(loader)
  const [open, setOpen] = useState(false)

  if (result.status === "loading") return <Loading label="支出マスタを読み込み中…" />
  if (result.status === "error") return <ErrorBox error={result.error} />

  const [expenses, minors, methods] = result.data
  const minorMap = buildMap(minors, (m) => m.id)
  const methodMap = buildMap(methods, (m) => m.id)
  const handleCreated = () => {
    setOpen(false)
    result.refetch()
  }

  return (
    <Panel title="支出マスタ" actionLabel="＋ 追加" onAction={() => setOpen(true)}>
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
      {open && (
        <ExpenseMasterFormModal
          onClose={() => setOpen(false)}
          onCreated={handleCreated}
          minors={minors}
          paymentMethods={methods}
        />
      )}
    </Panel>
  )
}

function IncomeMastersSection() {
  const loader = useCallback(
    () => Promise.all([api.incomes(), api.minorCategories()]),
    [],
  )
  const result = useFetch(loader)
  const [open, setOpen] = useState(false)

  if (result.status === "loading") return <Loading label="収入マスタを読み込み中…" />
  if (result.status === "error") return <ErrorBox error={result.error} />

  const [incomes, minors] = result.data
  const minorMap = buildMap(minors, (m) => m.id)
  const handleCreated = () => {
    setOpen(false)
    result.refetch()
  }

  return (
    <Panel title="収入マスタ" actionLabel="＋ 追加" onAction={() => setOpen(true)}>
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
      {open && (
        <IncomeMasterFormModal
          onClose={() => setOpen(false)}
          onCreated={handleCreated}
          minors={minors}
        />
      )}
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

function Panel({
  title,
  actionLabel,
  onAction,
  children,
}: {
  title: string
  actionLabel?: string
  onAction?: () => void
  children: React.ReactNode
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-lg font-semibold">{title}</h3>
        {actionLabel && (
          <button
            type="button"
            onClick={onAction}
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500"
          >
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
