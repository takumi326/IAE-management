import { useMemo, useState } from "react"
import { api, type MinorCategory } from "../lib/api.ts"
import { apiErrorMessage } from "../lib/errors.ts"
import { sortMinorCategories } from "../lib/categorySort.ts"
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
  memo?: string
}

type PendingImportRow = {
  lineNumber: number
  monthDate: string
  monthLabel: string
  categoryPath: string
  amount: number
  memo: string | null
  minor: MinorCategory
}

export function ImportModal({ onClose, onImported }: Props) {
  const [rawJson, setRawJson] = useState("")
  const [phase, setPhase] = useState<"edit" | "preview">("edit")
  const [pendingRows, setPendingRows] = useState<PendingImportRow[] | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [copyStatus, setCopyStatus] = useState<"idle" | "done" | "error">("idle")
  const dictionaries = useFetch(() => Promise.all([api.minorCategories(), api.paymentMethods()]))
  const expenseMinors = useMemo(
    () =>
      dictionaries.status === "success"
        ? sortMinorCategories(dictionaries.data[0].filter((m) => m.major_category.kind === "expense"))
        : [],
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
キーは次のとおり:
- "month": "YYYY-MM"（必須）
- "minor_category_id": 数値（必須。下の一覧の id のいずれか。明細の内容に最も近い小カテゴリを選ぶ）
- "amount": 数値（必須。円、0以上。支出はプラスの数で）
- "memo": 文字列（任意。短いメモ）

利用可能な小カテゴリ（支出）:
${catalog}

例:
[{"month":"2026-05","minor_category_id":${expenseMinors[0]?.id ?? 1},"amount":3500,"memo":"コンビニ"}]

不明な行は出力しない。

（明細をここに貼る）`
  }, [dictionaries.status, expenseMinors, fixedPaymentMethod])

  const buildPendingRows = (): PendingImportRow[] => {
    const rows = JSON.parse(rawJson) as ImportRow[]
    if (!Array.isArray(rows)) {
      throw new Error("JSON配列で入力してください")
    }
    return rows.map((row, index) => {
      const lineNumber = index + 1
      const idRaw = row.minor_category_id
      let minor: MinorCategory
      if (idRaw != null && Number.isFinite(Number(idRaw))) {
        const id = Number(idRaw)
        const found = expenseMinors.find((m) => m.id === id)
        if (!found) throw new Error(`${lineNumber}行目: minor_category_id ${id} は支出の小カテゴリにありません`)
        minor = found
      } else if (row.category != null && String(row.category).trim() !== "") {
        const found = findMinorByCategoryText(String(row.category))
        if (!found) throw new Error(`${lineNumber}行目: category が見つかりません (${row.category})`)
        minor = found
      } else {
        throw new Error(`${lineNumber}行目: minor_category_id（数値）が必要です`)
      }

      const monthDate = toMonthDate(row)
      const amount = Number(row.amount)
      if (!Number.isFinite(amount) || amount < 0) {
        throw new Error(`${lineNumber}行目: amount は0以上の数値にしてください`)
      }

      let memo: string | null = null
      if (row.memo != null && String(row.memo).trim() !== "") {
        memo = String(row.memo).trim()
        if (memo.length > 2000) throw new Error(`${lineNumber}行目: memo は2000文字以内にしてください`)
      }

      const monthLabel = monthDate.slice(0, 7)
      const categoryPath = `${minor.major_category.name} / ${minor.name}`

      return {
        lineNumber,
        monthDate,
        monthLabel,
        categoryPath,
        amount: Math.round(amount),
        memo,
        minor,
      }
    })
  }

  const onConfirmPreview = () => {
    if (dictionaries.status !== "success") return
    if (!fixedPaymentMethod) {
      setErrorMessage(`支払方法「${FIXED_PAYMENT_METHOD_NAME}」がマスタにありません。先に登録してください。`)
      return
    }
    setErrorMessage(null)
    try {
      const parsed = buildPendingRows()
      if (parsed.length === 0) {
        setErrorMessage("取り込む行がありません")
        return
      }
      setPendingRows(parsed)
      setPhase("preview")
    } catch (error) {
      setErrorMessage(apiErrorMessage(error))
    }
  }

  const backToEdit = () => {
    setPhase("edit")
    setPendingRows(null)
    setErrorMessage(null)
  }

  const executeImport = async () => {
    if (dictionaries.status !== "success" || !fixedPaymentMethod || !pendingRows?.length) return
    setSubmitting(true)
    setErrorMessage(null)
    try {
      const touchedMonths = new Set<string>()
      for (const row of pendingRows) {
        await api.createExpense({
          minor_category_id: row.minor.id,
          payment_method_id: fixedPaymentMethod.id,
          expense_type: "one_time",
          recurring_cycle: "monthly",
          renewal_month: null,
          amount: row.amount,
          start_month: row.monthDate,
          end_month: row.monthDate,
          memo: row.memo,
        })
        touchedMonths.add(row.monthDate)
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
  const jsonPlaceholder = `[{"month":"2026-05","minor_category_id":${exampleId},"amount":1200,"memo":""}]`

  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center bg-slate-900/40 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className={`w-full rounded-2xl bg-white p-5 shadow-xl ${phase === "preview" ? "max-w-3xl" : "max-w-xl"}`}
      >
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
            です。まず JSON を確認し、問題なければ取り込みます。
          </p>

          {phase === "edit" && (
            <>
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
              {errorMessage && (
                <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{errorMessage}</p>
              )}
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
            </>
          )}

          {phase === "preview" && pendingRows && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-slate-800">以下の内容で取り込みます。問題なければ「取り込む」を押してください。</p>
              <div className="max-h-72 overflow-auto rounded-lg border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="sticky top-0 bg-slate-50 text-left text-xs text-slate-500">
                    <tr>
                      <th className="px-3 py-2">#</th>
                      <th className="px-3 py-2">月</th>
                      <th className="px-3 py-2">カテゴリ</th>
                      <th className="px-3 py-2 text-right">金額</th>
                      <th className="px-3 py-2">メモ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pendingRows.map((r) => (
                      <tr key={r.lineNumber}>
                        <td className="px-3 py-2 text-slate-600">{r.lineNumber}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{r.monthLabel}</td>
                        <td className="px-3 py-2 text-slate-800">{r.categoryPath}</td>
                        <td className="px-3 py-2 text-right font-medium">¥{r.amount.toLocaleString("ja-JP")}</td>
                        <td className="max-w-[12rem] truncate px-3 py-2 text-slate-600" title={r.memo ?? undefined}>
                          {r.memo ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-slate-500">
                合計 {pendingRows.length} 件 / 金額計 ¥
                {pendingRows.reduce((s, r) => s + r.amount, 0).toLocaleString("ja-JP")}
              </p>
              {errorMessage && (
                <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{errorMessage}</p>
              )}
            </div>
          )}

          <div className="flex flex-wrap justify-end gap-2 pt-2">
            {phase === "edit" ? (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50"
                >
                  キャンセル
                </button>
                <button
                  type="button"
                  onClick={() => void onConfirmPreview()}
                  disabled={
                    dictionaries.status !== "success" ||
                    !fixedPaymentMethod ||
                    expenseMinors.length === 0 ||
                    rawJson.trim() === ""
                  }
                  className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-indigo-300"
                >
                  内容を確認
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={backToEdit}
                  disabled={submitting}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50 disabled:opacity-50"
                >
                  戻って修正
                </button>
                <button
                  type="button"
                  onClick={() => void executeImport()}
                  disabled={submitting}
                  className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-indigo-300"
                >
                  {submitting ? "取込中…" : "この内容で取り込む"}
                </button>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
