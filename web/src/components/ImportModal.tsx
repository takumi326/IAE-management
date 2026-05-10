import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { api, type ExpenseMaster, type MinorCategory } from "../lib/api.ts"
import { apiErrorMessage } from "../lib/errors.ts"
import { sortMinorCategories } from "../lib/categorySort.ts"
import { buildImportClaudePrompt } from "../lib/importPromptSettings.ts"
import { useFetch } from "../lib/useFetch.ts"

const FIXED_PAYMENT_METHOD_NAME = "Amazonカード"

type Props = {
  onClose: () => void
  onImported: () => void
}

/** Claude 向け: minor_category_id + month + amount。支払は Amazonカード 固定（JSON に含めない）。month は利用月で、翌月クレカとして翌暦月に台帳計上 */
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

type ExistingExpenseRow = {
  id: number
  rowIndex: number
  monthLabel: string
  categoryPath: string
  amount: number
  memo: string | null
  minorCategoryId: number
  duplicateWithPending: boolean
}

function accrualMonthFirstFromApi(m: string): string {
  const s = String(m).trim()
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10)
  if (/^\d{4}-\d{2}$/.test(s)) return `${s}-01`
  const d = new Date(s)
  if (!Number.isNaN(d.getTime())) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`
  }
  return s
}

/** 同期対象月（利用月）にこの支出マスタが載るか（API の target_expenses と同趣旨） */
function expenseAppliesToAccrualMonth(e: ExpenseMaster, accrualMonthFirst: string): boolean {
  const start = accrualMonthFirstFromApi(e.start_month)
  const end = e.end_month ? accrualMonthFirstFromApi(e.end_month) : null
  if (accrualMonthFirst < start) return false
  if (end != null && accrualMonthFirst > end) return false
  if (e.expense_type === "one_time") {
    return accrualMonthFirst === start
  }
  if (e.recurring_cycle === "monthly") {
    return true
  }
  if (e.recurring_cycle === "yearly") {
    const monthNum = Number(accrualMonthFirst.slice(5, 7))
    return (e.renewal_month ?? 0) === monthNum
  }
  return false
}

function minMonthLabel(rows: PendingImportRow[]): string {
  return rows.reduce((min, r) => (r.monthLabel < min ? r.monthLabel : min), rows[0].monthLabel)
}

function buildExistingRows(
  expenses: ExpenseMaster[],
  minors: MinorCategory[],
  compareMonthInput: string,
  pendingRows: PendingImportRow[],
): ExistingExpenseRow[] {
  const monthFirst = `${compareMonthInput}-01`
  const filtered = expenses.filter((e) => expenseAppliesToAccrualMonth(e, monthFirst))
  return filtered.map((e, idx) => {
    const minor = minors.find((m) => m.id === e.minor_category_id)
    const categoryPath = minor
      ? `${minor.major_category.name} / ${minor.name}`
      : `小カテゴリ id:${e.minor_category_id}`
    const amount = Math.round(Number(e.amount))
    const monthLabel =
      e.expense_type === "one_time" ? accrualMonthFirstFromApi(e.start_month).slice(0, 7) : compareMonthInput
    const memoRaw = e.memo != null ? String(e.memo).trim() : ""
    const memo = memoRaw === "" ? null : memoRaw
    const duplicateWithPending = pendingRows.some(
      (pr) => pr.monthLabel === compareMonthInput && pr.minor.id === e.minor_category_id && pr.amount === amount,
    )
    return {
      id: e.id,
      rowIndex: idx + 1,
      monthLabel,
      categoryPath,
      amount,
      memo,
      minorCategoryId: e.minor_category_id,
      duplicateWithPending,
    }
  })
}

function ImportPreviewTable({
  title,
  rows,
}: {
  title: string
  rows: { key: string | number; num: number; month: string; category: string; amount: number; memo: string | null; warn: boolean }[]
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col rounded-lg border border-slate-200">
      <h4 className="shrink-0 border-b border-slate-100 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-800">{title}</h4>
      <div className="min-h-0 max-h-72 flex-1 overflow-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="sticky top-0 z-1 bg-slate-50 text-left text-xs text-slate-500">
            <tr>
              <th className="px-3 py-2">#</th>
              <th className="px-3 py-2">月</th>
              <th className="px-3 py-2">カテゴリ</th>
              <th className="px-3 py-2 text-right">金額</th>
              <th className="px-3 py-2">メモ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-4 text-center text-xs text-slate-500">
                  該当する行がありません
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.key} className={r.warn ? "bg-amber-50" : undefined}>
                  <td className="px-3 py-2 text-slate-600">{r.num}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{r.month}</td>
                  <td className="px-3 py-2 text-slate-800">{r.category}</td>
                  <td className="px-3 py-2 text-right font-medium">¥{r.amount.toLocaleString("ja-JP")}</td>
                  <td className="max-w-48 truncate px-3 py-2 text-slate-600" title={r.memo ?? undefined}>
                    {r.warn ? <span className="font-medium text-amber-800">重複候補 </span> : null}
                    {r.memo ?? "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function ImportModal({ onClose, onImported }: Props) {
  const [rawJson, setRawJson] = useState("")
  const [phase, setPhase] = useState<"edit" | "preview">("edit")
  const [pendingRows, setPendingRows] = useState<PendingImportRow[] | null>(null)
  const [compareMonthInput, setCompareMonthInput] = useState<string>("")
  const [existingExpenses, setExistingExpenses] = useState<ExpenseMaster[] | null>(null)
  const [existingLoad, setExistingLoad] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [existingLoadError, setExistingLoadError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [copyStatus, setCopyStatus] = useState<"idle" | "done" | "error">("idle")
  const bundle = useFetch(() => Promise.all([api.minorCategories(), api.paymentMethods(), api.userPreferences()]))
  const expenseMinors = useMemo(
    () =>
      bundle.status === "success"
        ? sortMinorCategories(bundle.data[0].filter((m) => m.major_category.kind === "expense"))
        : [],
    [bundle],
  )
  const methods = useMemo(
    () => (bundle.status === "success" ? bundle.data[1] : []),
    [bundle],
  )

  const fixedPaymentMethod = useMemo(
    () => methods.find((m) => m.name === FIXED_PAYMENT_METHOD_NAME) ?? null,
    [methods],
  )

  useEffect(() => {
    if (phase !== "preview") return
    let cancelled = false
    void api
      .expenses()
      .then((data) => {
        if (cancelled) return
        setExistingExpenses(data)
        setExistingLoad("success")
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setExistingLoad("error")
        setExistingLoadError(apiErrorMessage(err))
      })
    return () => {
      cancelled = true
    }
  }, [phase])

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
    if (bundle.status !== "success") {
      return "マスタを読み込み中です。しばらくしてから再度「プロンプトをコピー」してください。"
    }
    if (!fixedPaymentMethod) {
      return `支払方法「${FIXED_PAYMENT_METHOD_NAME}」がマスタにありません。支出・収入タブの支払方法で「${FIXED_PAYMENT_METHOD_NAME}」（クレジットカード）を追加してからプロンプトを使ってください。`
    }
    if (fixedPaymentMethod.method_type !== "card") {
      return `取り込みは翌月クレカ前提のため、支払方法「${FIXED_PAYMENT_METHOD_NAME}」の種別をクレジットカードにしてください。`
    }
    if (expenseMinors.length === 0) {
      return "支出の小カテゴリがありません。先にマスタを整えてください。"
    }

    const catalog = expenseMinors
      .map((m) => `- id ${m.id}: ${m.major_category.name} / ${m.name}`)
      .join("\n")

    return buildImportClaudePrompt({
      catalog,
      paymentMethodName: FIXED_PAYMENT_METHOD_NAME,
      exampleMinorId: expenseMinors[0]?.id ?? 1,
      savedTemplate: bundle.data[2].import_claude_prompt_template,
    })
  }, [bundle, expenseMinors, fixedPaymentMethod])

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

  const existingRows = useMemo(() => {
    if (!pendingRows || !existingExpenses || !/^\d{4}-\d{2}$/.test(compareMonthInput)) return []
    return buildExistingRows(existingExpenses, expenseMinors, compareMonthInput, pendingRows)
  }, [existingExpenses, expenseMinors, compareMonthInput, pendingRows])

  const pendingDuplicateLineNumbers = useMemo(() => {
    if (!pendingRows || !compareMonthInput) return new Set<number>()
    const set = new Set<number>()
    for (const pr of pendingRows) {
      if (pr.monthLabel !== compareMonthInput) continue
      const dup = existingRows.some((er) => er.minorCategoryId === pr.minor.id && er.amount === pr.amount)
      if (dup) set.add(pr.lineNumber)
    }
    return set
  }, [pendingRows, compareMonthInput, existingRows])

  const leftTableRows = useMemo(
    () =>
      existingRows.map((er) => ({
        key: er.id,
        num: er.rowIndex,
        month: er.monthLabel,
        category: er.categoryPath,
        amount: er.amount,
        memo: er.memo,
        warn: er.duplicateWithPending,
      })),
    [existingRows],
  )

  const rightTableRows = useMemo(
    () =>
      (pendingRows ?? []).map((r) => ({
        key: r.lineNumber,
        num: r.lineNumber,
        month: r.monthLabel,
        category: r.categoryPath,
        amount: r.amount,
        memo: r.memo,
        warn: pendingDuplicateLineNumbers.has(r.lineNumber),
      })),
    [pendingRows, pendingDuplicateLineNumbers],
  )

  const onConfirmPreview = () => {
    if (bundle.status !== "success") return
    if (!fixedPaymentMethod) {
      setErrorMessage(`支払方法「${FIXED_PAYMENT_METHOD_NAME}」がマスタにありません。先に登録してください。`)
      return
    }
    if (fixedPaymentMethod.method_type !== "card") {
      setErrorMessage(
        `取り込みは翌月クレカ前提です。「${FIXED_PAYMENT_METHOD_NAME}」の種別をクレジットカードにしてから再度お試しください。`,
      )
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
      setCompareMonthInput(minMonthLabel(parsed))
      setExistingExpenses(null)
      setExistingLoad("loading")
      setExistingLoadError(null)
      setPhase("preview")
    } catch (error) {
      setErrorMessage(apiErrorMessage(error))
    }
  }

  const backToEdit = () => {
    setPhase("edit")
    setPendingRows(null)
    setCompareMonthInput("")
    setErrorMessage(null)
    setExistingExpenses(null)
    setExistingLoad("idle")
    setExistingLoadError(null)
  }

  const executeImport = async () => {
    if (bundle.status !== "success" || !fixedPaymentMethod || !pendingRows?.length) return
    if (fixedPaymentMethod.method_type !== "card") {
      setErrorMessage(
        `取り込みは翌月クレカ前提です。「${FIXED_PAYMENT_METHOD_NAME}」の種別をクレジットカードにしてください。`,
      )
      return
    }
    setSubmitting(true)
    setErrorMessage(null)
    try {
      await api.updatePaymentMethod(fixedPaymentMethod.id, {
        ledger_charge_timing: "next_month",
      })
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
        await api.syncActuals({ month, expense_scope: "one_time" })
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
        className={`w-full rounded-2xl bg-white p-5 shadow-xl ${phase === "preview" ? "max-w-6xl" : "max-w-xl"}`}
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
            各行は<strong>単発の支出</strong>としてマスタに追加されます。JSON の <strong>month</strong> は<strong>カード利用月</strong>（YYYY-MM）です。支払方法は常に
            <strong> {FIXED_PAYMENT_METHOD_NAME} </strong>（クレジットカード）で、取り込み時に<strong>翌月計上</strong>にそろえたうえで、<strong>実績台帳は翌暦月</strong>に付きます（例: 利用 4 月 → 台帳 5 月）。まず JSON を確認し、問題なければ取り込みます。
          </p>
          <p className="text-xs text-slate-500">
            Claude 用のプロンプト本文は{" "}
            <Link to="/settings#import-prompt" className="font-medium text-indigo-600 underline hover:text-indigo-500">
              設定
            </Link>
            から編集できます（サーバーに保存されます）。
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
                      disabled={
                        bundle.status !== "success" ||
                        !fixedPaymentMethod ||
                        fixedPaymentMethod.method_type !== "card" ||
                        expenseMinors.length === 0
                      }
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
              <p className="text-sm font-medium text-slate-800">
                左で比較する月を選び、保存済みの支出マスタと今回取り込む内容を並べて確認してください（同一利用月・同一カテゴリ・同一金額は重複候補として色付けします）。
              </p>
              <label className="flex flex-wrap items-center gap-2 text-sm">
                <span className="text-slate-600">比較する月（左の一覧）</span>
                <input
                  type="month"
                  value={compareMonthInput}
                  onChange={(e) => setCompareMonthInput(e.target.value)}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                />
              </label>
              {existingLoad === "loading" && <p className="text-xs text-slate-500">保存済み支出を読み込み中…</p>}
              {existingLoad === "error" && existingLoadError && (
                <p className="text-xs text-rose-700">保存済み支出の取得に失敗: {existingLoadError}</p>
              )}
              <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch">
                <ImportPreviewTable title="保存済みの支出（マスタ）" rows={leftTableRows} />
                <ImportPreviewTable title="今回取り込む（単発）" rows={rightTableRows} />
              </div>
              <p className="text-xs text-slate-500">
                今回取り込む: {pendingRows.length} 件 / 金額計 ¥
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
                    bundle.status !== "success" ||
                    !fixedPaymentMethod ||
                    fixedPaymentMethod.method_type !== "card" ||
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
