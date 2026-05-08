import { useMemo, useState } from "react"
import { api } from "../lib/api.ts"
import { apiErrorMessage } from "../lib/errors.ts"
import { useFetch } from "../lib/useFetch.ts"

type Props = {
  onClose: () => void
  onImported: () => void
}

type ImportRow = {
  month?: string
  payment_date?: string
  category: string
  amount: number
  payment: string
}

export function ImportModal({ onClose, onImported }: Props) {
  const [rawJson, setRawJson] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [copyStatus, setCopyStatus] = useState<"idle" | "done" | "error">("idle")
  const dictionaries = useFetch(() => Promise.all([api.minorCategories(), api.paymentMethods()]))
  const expenseMinors = useMemo(
    () => (dictionaries.status === "success" ? dictionaries.data[0].filter((m) => m.major_category.kind === "expense") : []),
    [dictionaries],
  )
  const methods = dictionaries.status === "success" ? dictionaries.data[1] : []

  const findMinor = (text: string) => {
    const key = text.trim()
    return (
      expenseMinors.find((m) => `${m.major_category.name} / ${m.name}` === key) ??
      expenseMinors.find((m) => m.name === key)
    )
  }
  const findMethod = (text: string) => methods.find((m) => m.name === text.trim())

  const toMonthDate = (row: ImportRow): string => {
    if (row.payment_date) return `${row.payment_date.slice(0, 7)}-01`
    if (row.month) return `${row.month.slice(0, 7)}-01`
    throw new Error("month か payment_date が必要です")
  }

  const onSubmit = async () => {
    if (dictionaries.status !== "success") return
    setSubmitting(true)
    setErrorMessage(null)
    try {
      const rows = JSON.parse(rawJson) as ImportRow[]
      if (!Array.isArray(rows)) {
        throw new Error("JSON配列で入力してください")
      }
      const touchedMonths = new Set<string>()
      for (const [index, row] of rows.entries()) {
        const minor = findMinor(row.category)
        if (!minor) throw new Error(`${index + 1}行目: category が見つかりません (${row.category})`)
        const method = findMethod(row.payment)
        if (!method) throw new Error(`${index + 1}行目: payment が見つかりません (${row.payment})`)
        const monthDate = toMonthDate(row)
        const amount = Number(row.amount)
        if (!Number.isFinite(amount) || amount < 0) throw new Error(`${index + 1}行目: amount は0以上の数値にしてください`)

        await api.createExpense({
          minor_category_id: minor.id,
          payment_method_id: method.id,
          expense_type: "one_time",
          recurring_cycle: "monthly",
          renewal_month: null,
          amount: Math.round(amount),
          start_month: monthDate,
          end_month: null,
        })
        touchedMonths.add(monthDate)
      }
      for (const month of touchedMonths) {
        await api.syncActuals({ month })
      }
      onImported()
    } catch (error) {
      setErrorMessage(apiErrorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  const claudePrompt = `あなたは家計データをJSON配列に整形するアシスタントです。
次のルールを厳守して、最終出力はJSON配列のみを返してください（説明文・コードブロック・コメント禁止）。

# 出力フォーマット
各要素は以下のキーを持つこと:
- "month": "YYYY-MM" 形式（または "payment_date": "YYYY-MM-DD" でも可）
- "category": カテゴリ文字列（例: "趣味・娯楽 / サブスク"）
- "amount": 数値（0以上の整数）
- "payment": 支払方法名（文字列）

# 重要ルール
- JSON以外は一切出力しない
- 配列で返す（1件でも配列）
- amount は数値型（文字列にしない）
- 日付は必ずゼロ埋め（例: 2026-05, 2026-05-12）
- category / payment は入力に合わせて正規化するが、意味を変えない
- 不明な項目は推測せず、そのレコードは除外する

# 変換対象データ
（ここに明細テキストを貼る）

# 出力例
[
  {"month":"2026-05","category":"趣味・娯楽 / サブスク","amount":3500,"payment":"PayPayカード"},
  {"payment_date":"2026-05-12","category":"生活費 / 食費","amount":1200,"payment":"みずほ口座引落"}
]`

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(claudePrompt)
      setCopyStatus("done")
      setTimeout(() => setCopyStatus("idle"), 2000)
    } catch {
      setCopyStatus("error")
    }
  }

  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center bg-slate-900/40 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="w-full max-w-xl rounded-2xl bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">実績を取込</h3>
          <button type="button" className="text-slate-400 hover:text-slate-600" onClick={onClose}>
            ×
          </button>
        </div>

        <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
          <details className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <summary className="cursor-pointer text-sm font-medium text-slate-700">Claude用プロンプト（コピー可）</summary>
            <div className="mt-3 space-y-2">
              <textarea
                readOnly
                value={claudePrompt}
                rows={10}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-xs"
              />
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => void copyPrompt()}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100"
                >
                  プロンプトをコピー
                </button>
                {copyStatus === "done" && <p className="text-xs text-emerald-700">コピーしました</p>}
                {copyStatus === "error" && <p className="text-xs text-rose-700">コピーに失敗しました</p>}
              </div>
            </div>
          </details>
          {errorMessage && <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{errorMessage}</p>}
          <label className="block text-sm">
            <span className="text-slate-600">JSON</span>
            <textarea
              rows={10}
              value={rawJson}
              onChange={(e) => setRawJson(e.target.value)}
              placeholder='[{"month":"2026-05","category":"趣味・娯楽 / サブスク","amount":3500,"payment":"PayPayカード"}]'
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs"
            />
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50"
            >
              キャンセル
            </button>
            <button
              type="button"
              onClick={() => void onSubmit()}
              disabled={submitting || dictionaries.status !== "success" || rawJson.trim() === ""}
              className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-indigo-300"
            >
              {submitting ? "取込中…" : "取込実行"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
