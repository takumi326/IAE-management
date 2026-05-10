import { useMemo, useState } from "react"
import { api } from "../lib/api.ts"
import { apiErrorMessage } from "../lib/errors.ts"
import { useFetch } from "../lib/useFetch.ts"

const FIXED_PAYMENT_METHOD_NAME = "Amazonカード"

type Props = {
  onClose: () => void
  onImported: () => void
}

/** Claude 向け: minor_category_id + month + amount。支払は Amazonカード 固定（JSON に含めない） */
type ImportRow = {
  month?: string
  payment_date?: string
  minor_category_id?: number
  /** 後方互換: 旧プロンプトの文字列カテゴリ */
  category?: string
  amount: number
  payment?: string
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
  const methods = useMemo(
    () => (dictionaries.status === "success" ? dictionaries.data[1] : []),
    [dictionaries],
  )

  const fixedPaymentMethod = useMemo(
    () => methods.find((m) => m.name === FIXED_PAYMENT_METHOD_NAME) ?? null,
    [methods],
  )

  const findMinorByCategoryText = (text: string) => {
    const key = text.trim()
    return (
      expenseMinors.find((m) => `${m.major_category.name} / ${m.name}` === key) ??
      expenseMinors.find((m) => m.name === key)
    )
  }

  const toMonthDate = (row: ImportRow): string => {
    if (row.month) return `${String(row.month).slice(0, 7)}-01`
    if (row.payment_date) return `${String(row.payment_date).slice(0, 7)}-01`
    throw new Error("month（YYYY-MM）が必要です")
  }

  const claudePrompt = useMemo(() => {
    if (dictionaries.status !== "success") {
      return "マスタを読み込み中です。しばらくしてから再度「プロンプトをコピー」してください。"
    }
    if (!fixedPaymentMethod) {
      return `支払方法「${FIXED_PAYMENT_METHOD_NAME}」がマスタにありません。支出・収入タブの支払方法で「${FIXED_PAYMENT_METHOD_NAME}」を追加してからプロンプトを使ってください。`
    }
    if (expenseMinors.length === 0) {
      return "支出の小カテゴリがありません。先にマスタを整えてください。"
    }

    const catalog = expenseMinors
      .map((m) => `- id ${m.id}: ${m.major_category.name} / ${m.name}`)
      .join("\n")

    return `次の支払い明細を、JSONの配列だけにしてください（説明・\`\`\`・コメントは禁止）。

1行＝単発支出1件。支払方法はすべて「${FIXED_PAYMENT_METHOD_NAME}」固定なので JSON には含めない。
キーは次の3つだけ:
- "month": "YYYY-MM"
- "minor_category_id": 数値（下の一覧の id のいずれか。明細の内容に最も近い小カテゴリを選ぶ）
- "amount": 数値（円、0以上。支出はプラスの数で）

利用可能な小カテゴリ（支出）:
${catalog}

例:
[{"month":"2026-05","minor_category_id":${expenseMinors[0]?.id ?? 1},"amount":3500}]

不明な行は出力しない。

（明細をここに貼る）`
  }, [dictionaries.status, expenseMinors, fixedPaymentMethod])

  const onSubmit = async () => {
    if (dictionaries.status !== "success") return
    if (!fixedPaymentMethod) {
      setErrorMessage(`支払方法「${FIXED_PAYMENT_METHOD_NAME}」がマスタにありません。先に登録してください。`)
      return
    }
    setSubmitting(true)
    setErrorMessage(null)
    try {
      const rows = JSON.parse(rawJson) as ImportRow[]
      if (!Array.isArray(rows)) {
        throw new Error("JSON配列で入力してください")
      }
      const touchedMonths = new Set<string>()
      for (const [index, row] of rows.entries()) {
        let minor = null
        const idRaw = row.minor_category_id
        if (idRaw != null && Number.isFinite(Number(idRaw))) {
          const id = Number(idRaw)
          minor = expenseMinors.find((m) => m.id === id) ?? null
          if (!minor) throw new Error(`${index + 1}行目: minor_category_id ${id} は支出の小カテゴリにありません`)
        } else if (row.category != null && String(row.category).trim() !== "") {
          minor = findMinorByCategoryText(String(row.category))
          if (!minor) throw new Error(`${index + 1}行目: category が見つかりません (${row.category})`)
        } else {
          throw new Error(`${index + 1}行目: minor_category_id（数値）が必要です`)
        }

        const monthDate = toMonthDate(row)
        const amount = Number(row.amount)
        if (!Number.isFinite(amount) || amount < 0) throw new Error(`${index + 1}行目: amount は0以上の数値にしてください`)

        await api.createExpense({
          minor_category_id: minor.id,
          payment_method_id: fixedPaymentMethod.id,
          expense_type: "one_time",
          recurring_cycle: "monthly",
          renewal_month: null,
          amount: Math.round(amount),
          start_month: monthDate,
          end_month: monthDate,
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

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(claudePrompt)
      setCopyStatus("done")
      setTimeout(() => setCopyStatus("idle"), 2000)
    } catch {
      setCopyStatus("error")
    }
  }

  const exampleId = expenseMinors[0]?.id ?? 1
  const jsonPlaceholder = `[{"month":"2026-05","minor_category_id":${exampleId},"amount":1200}]`

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
          <button
            type="button"
            className="-m-1 flex h-11 min-w-11 shrink-0 items-center justify-center rounded-lg text-2xl leading-none text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            onClick={onClose}
            aria-label="閉じる"
          >
            ×
          </button>
        </div>

        <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
          <p className="text-xs text-slate-600">
            各行は<strong>単発の支出</strong>としてマスタに追加され、該当する月の実績に反映されます。支払方法は常に
            <strong> {FIXED_PAYMENT_METHOD_NAME} </strong>
            です。
          </p>
          <details className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <summary className="cursor-pointer text-sm font-medium text-slate-700">Claude用プロンプト（コピー可）</summary>
            <div className="mt-3 space-y-2">
              <textarea
                readOnly
                value={claudePrompt}
                rows={16}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-xs"
              />
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => void copyPrompt()}
                  disabled={dictionaries.status !== "success" || !fixedPaymentMethod || expenseMinors.length === 0}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
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
              placeholder={jsonPlaceholder}
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
              disabled={
                submitting ||
                dictionaries.status !== "success" ||
                !fixedPaymentMethod ||
                rawJson.trim() === ""
              }
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
