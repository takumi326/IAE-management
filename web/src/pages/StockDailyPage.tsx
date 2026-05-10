import { useEffect, useMemo, useState } from "react"
import ReactMarkdown from "react-markdown"
import { FormActions, FormError, Modal } from "../components/Modal.tsx"
import { api, type UserPreferences } from "../lib/api.ts"
import { apiErrorMessage } from "../lib/errors.ts"

type StockDailyRow = {
  id: string
  date: string
  /** 仮説 */
  hypothesis: string
  result: string
  sectorResearch: string
  createdAt: string
}

const STORAGE_KEY = "solarc:stock-daily-notes:v1"

type EditField = "hypothesis" | "result" | "sector"

const FIELD_LABEL: Record<EditField, string> = {
  hypothesis: "仮説",
  result: "結果",
  sector: "セクター調べ",
}

function stockDailyPromptsFromPrefs(p: UserPreferences): {
  hypothesis: string
  result: string
  sector: string
} {
  return {
    hypothesis: (p.stock_daily_hypothesis_prompt ?? "").trimEnd(),
    result: (p.stock_daily_result_prompt ?? "").trimEnd(),
    sector: (p.stock_daily_sector_prompt ?? "").trimEnd(),
  }
}

function upsertRowField(
  rows: StockDailyRow[],
  recordDate: string,
  field: EditField,
  value: string,
): StockDailyRow[] {
  const existing = rows.find((r) => r.date === recordDate)
  const now = new Date().toISOString()
  const nextRow: StockDailyRow = existing
    ? {
        ...existing,
        hypothesis: field === "hypothesis" ? value : existing.hypothesis,
        result: field === "result" ? value : existing.result,
        sectorResearch: field === "sector" ? value : existing.sectorResearch,
      }
    : {
        id: crypto.randomUUID(),
        date: recordDate,
        hypothesis: field === "hypothesis" ? value : "",
        result: field === "result" ? value : "",
        sectorResearch: field === "sector" ? value : "",
        createdAt: now,
      }
  const empty =
    !nextRow.hypothesis.trim() && !nextRow.result.trim() && !nextRow.sectorResearch.trim()
  const rest = rows.filter((r) => r.date !== recordDate)
  if (empty) return rest
  return [nextRow, ...rest]
}

export function StockDailyPage() {
  const [rows, setRows] = useState<StockDailyRow[]>(() => readRows())
  const [fieldEdit, setFieldEdit] = useState<{ date: string; field: EditField } | null>(null)
  const [fieldDraft, setFieldDraft] = useState("")

  const [promptModalOpen, setPromptModalOpen] = useState(false)
  const [draftHypothesis, setDraftHypothesis] = useState("")
  const [draftResult, setDraftResult] = useState("")
  const [draftSector, setDraftSector] = useState("")
  const [promptOpenError, setPromptOpenError] = useState<string | null>(null)
  const [promptSaveError, setPromptSaveError] = useState<string | null>(null)
  const [promptSaving, setPromptSaving] = useState(false)
  const [savedStockPrompts, setSavedStockPrompts] = useState({
    hypothesis: "",
    result: "",
    sector: "",
  })
  const [promptsLoadError, setPromptsLoadError] = useState<string | null>(null)
  const [copiedKey, setCopiedKey] = useState<"hypothesis" | "result" | "sector" | null>(null)
  const [detailRow, setDetailRow] = useState<StockDailyRow | null>(null)

  const [createRecordOpen, setCreateRecordOpen] = useState(false)
  const [createDate, setCreateDate] = useState(today())
  const [createHypothesis, setCreateHypothesis] = useState("")
  const [createError, setCreateError] = useState<string | null>(null)

  const sortedRows = useMemo(
    () => [...rows].sort((a, b) => (a.date < b.date ? 1 : -1)),
    [rows],
  )

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const p = await api.userPreferences()
        if (cancelled) return
        setSavedStockPrompts(stockDailyPromptsFromPrefs(p))
        setPromptsLoadError(null)
      } catch (err) {
        if (!cancelled) setPromptsLoadError(apiErrorMessage(err))
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const saveRows = (next: StockDailyRow[]) => {
    setRows(next)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  }

  const openFieldEdit = (recordDate: string, field: EditField) => {
    const row = rows.find((r) => r.date === recordDate)
    const initial =
      field === "hypothesis"
        ? (row?.hypothesis ?? "")
        : field === "result"
          ? (row?.result ?? "")
          : (row?.sectorResearch ?? "")
    setFieldDraft(initial)
    setFieldEdit({ date: recordDate, field })
  }

  const closeFieldEdit = () => {
    setFieldEdit(null)
    setFieldDraft("")
  }

  const saveFieldEdit = () => {
    if (!fieldEdit) return
    saveRows(upsertRowField(rows, fieldEdit.date, fieldEdit.field, fieldDraft))
    closeFieldEdit()
  }

  const openCreateRecordModal = () => {
    setCreateDate(today())
    setCreateHypothesis("")
    setCreateError(null)
    setCreateRecordOpen(true)
  }

  const closeCreateRecordModal = () => {
    setCreateRecordOpen(false)
    setCreateError(null)
  }

  const saveCreateRecord = () => {
    setCreateError(null)
    if (!createHypothesis.trim()) {
      setCreateError("仮説を入力してください")
      return
    }
    saveRows(upsertRowField(rows, createDate, "hypothesis", createHypothesis))
    closeCreateRecordModal()
  }

  const openPromptEditModal = () => {
    setPromptModalOpen(true)
    setPromptOpenError(null)
    setPromptSaveError(null)
    void (async () => {
      try {
        const prefs = await api.userPreferences()
        const s = stockDailyPromptsFromPrefs(prefs)
        setDraftHypothesis(s.hypothesis)
        setDraftResult(s.result)
        setDraftSector(s.sector)
      } catch (err) {
        setPromptOpenError(apiErrorMessage(err))
        setDraftHypothesis("")
        setDraftResult("")
        setDraftSector("")
      }
    })()
  }

  const closePromptModal = () => {
    setPromptModalOpen(false)
    setPromptOpenError(null)
    setPromptSaveError(null)
  }

  const saveStockDailyPrompts = async () => {
    setPromptSaveError(null)
    setPromptSaving(true)
    try {
      const norm = (s: string) => s.replace(/\r\n/g, "\n").trimEnd()
      const h = norm(draftHypothesis)
      const r = norm(draftResult)
      const sec = norm(draftSector)
      const data = await api.updateUserPreferences({
        stock_daily_hypothesis_prompt: h === "" ? null : h,
        stock_daily_result_prompt: r === "" ? null : r,
        stock_daily_sector_prompt: sec === "" ? null : sec,
      })
      setSavedStockPrompts(stockDailyPromptsFromPrefs(data))
      setPromptsLoadError(null)
      closePromptModal()
    } catch (err) {
      setPromptSaveError(apiErrorMessage(err))
    } finally {
      setPromptSaving(false)
    }
  }

  const copyStockPrompt = async (key: "hypothesis" | "result" | "sector") => {
    const text =
      key === "hypothesis"
        ? savedStockPrompts.hypothesis
        : key === "result"
          ? savedStockPrompts.result
          : savedStockPrompts.sector
    const forClipboard = applyStockPromptPlaceholders(text, today())
    try {
      await navigator.clipboard.writeText(forClipboard)
      setCopiedKey(key)
      window.setTimeout(() => {
        setCopiedKey((c) => (c === key ? null : c))
      }, 2000)
    } catch {
      setPromptsLoadError("クリップボードへのコピーに失敗しました")
    }
  }

  const deleteRecordRow = (recordDate: string) => {
    saveRows(rows.filter((r) => r.date !== recordDate))
    setDetailRow((current) => (current?.date === recordDate ? null : current))
  }

  const confirmDeleteRecord = (recordDate: string) => {
    const label = formatRecordDateJp(recordDate)
    if (
      !window.confirm(
        `${label}の記録を削除しますか？\n仮説・結果・セクター調べがすべて消えます。`,
      )
    ) {
      return
    }
    deleteRecordRow(recordDate)
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-bold">毎日の記録</h2>
      </section>

      {promptModalOpen && (
        <Modal title="プロンプト編集" onClose={closePromptModal} size="lg">
          <p className="mb-2 text-sm text-slate-600">
            毎日の記録の仮説・結果・セクター調べ用の Claude プロンプトをそれぞれ保存します。空で保存するとその項目は未設定になります。コピー時に次のプレースホルダを今日の日付へ置き換えます（大文字小文字無視・前後に空白可）:{" "}
            <code className="rounded bg-slate-100 px-1 text-xs">{"{{date}}"}</code> は{" "}
            <code className="rounded bg-slate-100 px-1 text-xs">YYYY年MM月DD日</code>、{" "}
            <code className="rounded bg-slate-100 px-1 text-xs">{"{{date_iso}}"}</code> は{" "}
            <code className="rounded bg-slate-100 px-1 text-xs">YYYY-MM-DD</code>、{" "}
            <code className="rounded bg-slate-100 px-1 text-xs">{"{{記録日}}"}</code> は{" "}
            <code className="rounded bg-slate-100 px-1 text-xs">{"{{date}}"}</code> と同じです。
          </p>
          <FormError message={promptOpenError} />
          <FormError message={promptSaveError} />
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault()
              void saveStockDailyPrompts()
            }}
          >
            <label className="block text-sm text-slate-700">
              仮説
              <textarea
                value={draftHypothesis}
                onChange={(e) => setDraftHypothesis(e.target.value)}
                rows={10}
                spellCheck={false}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs leading-relaxed"
              />
            </label>
            <label className="block text-sm text-slate-700">
              結果
              <textarea
                value={draftResult}
                onChange={(e) => setDraftResult(e.target.value)}
                rows={10}
                spellCheck={false}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs leading-relaxed"
              />
            </label>
            <label className="block text-sm text-slate-700">
              セクター調べ
              <textarea
                value={draftSector}
                onChange={(e) => setDraftSector(e.target.value)}
                rows={10}
                spellCheck={false}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs leading-relaxed"
              />
            </label>
            <FormActions
              onCancel={closePromptModal}
              submitLabel="プロンプトを保存"
              submitting={promptSaving}
            />
          </form>
        </Modal>
      )}

      {fieldEdit && (
        <Modal
          title={`${FIELD_LABEL[fieldEdit.field]}を編集（${formatRecordDateJp(fieldEdit.date)}）`}
          onClose={closeFieldEdit}
          size="lg"
        >
          <p className="mb-2 text-xs text-slate-500">マークダウンで入力してください（詳細ではレンダリングして表示します）。</p>
          <textarea
            value={fieldDraft}
            onChange={(e) => setFieldDraft(e.target.value)}
            rows={18}
            spellCheck={false}
            placeholder={"# 見出し\n- リスト\n```\nコード\n```"}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm leading-relaxed"
          />
          <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-3">
            <button
              type="button"
              onClick={closeFieldEdit}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50"
            >
              キャンセル
            </button>
            <button
              type="button"
              onClick={saveFieldEdit}
              className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500"
            >
              保存
            </button>
          </div>
        </Modal>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={openPromptEditModal}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 hover:bg-slate-50"
          >
            プロンプト編集
          </button>
          <button
            type="button"
            onClick={() => void copyStockPrompt("hypothesis")}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 hover:bg-slate-50"
          >
            {copiedKey === "hypothesis" ? "仮説コピー済" : "仮説コピー"}
          </button>
          <button
            type="button"
            onClick={() => void copyStockPrompt("result")}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 hover:bg-slate-50"
          >
            {copiedKey === "result" ? "結果コピー済" : "結果コピー"}
          </button>
          <button
            type="button"
            onClick={() => void copyStockPrompt("sector")}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 hover:bg-slate-50"
          >
            {copiedKey === "sector" ? "セクター調べコピー済" : "セクター調べコピー"}
          </button>
        </div>
        <FormError message={promptsLoadError} />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-lg font-semibold">保存済み記録</h3>
          <button
            type="button"
            onClick={openCreateRecordModal}
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500"
          >
            作成
          </button>
        </div>
        {sortedRows.length === 0 ? (
          <p className="text-sm text-slate-500">まだ記録がありません。</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full min-w-0 border-collapse text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th className="border-b border-slate-200 px-2 py-2 text-left font-semibold whitespace-nowrap sm:px-3">
                    日付
                  </th>
                  <th className="border-b border-slate-200 px-2 py-2 text-center font-semibold sm:px-3">仮説</th>
                  <th className="border-b border-slate-200 px-2 py-2 text-center font-semibold sm:px-3">結果</th>
                  <th className="border-b border-slate-200 px-2 py-2 text-center font-semibold sm:px-3">セクター調べ</th>
                  <th className="border-b border-slate-200 px-2 py-2 text-center font-semibold whitespace-nowrap sm:px-3">
                    詳細
                  </th>
                  <th className="border-b border-slate-200 px-2 py-2 text-center font-semibold whitespace-nowrap sm:px-3">
                    削除
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedRows.map((row) => (
                  <tr key={row.id}>
                    <td className="px-2 py-3 font-medium whitespace-nowrap text-slate-800 sm:px-3">{row.date}</td>
                    <td className="w-28 min-w-28 border-b border-slate-100 px-1 py-3 align-middle sm:w-32 sm:min-w-32">
                      <SavedColumnCell
                        text={row.hypothesis}
                        label="仮説"
                        onEdit={() => openFieldEdit(row.date, "hypothesis")}
                      />
                    </td>
                    <td className="w-28 min-w-28 border-b border-slate-100 px-1 py-3 align-middle sm:w-32 sm:min-w-32">
                      <SavedColumnCell
                        text={row.result}
                        label="結果"
                        onEdit={() => openFieldEdit(row.date, "result")}
                      />
                    </td>
                    <td className="w-28 min-w-28 border-b border-slate-100 px-1 py-3 align-middle sm:w-32 sm:min-w-32">
                      <SavedColumnCell
                        text={row.sectorResearch}
                        label="セクター調べ"
                        onEdit={() => openFieldEdit(row.date, "sector")}
                      />
                    </td>
                    <td className="border-b border-slate-100 px-2 py-3 text-center align-middle sm:px-3">
                      <button
                        type="button"
                        onClick={() => setDetailRow(row)}
                        className="rounded-md border border-indigo-200 bg-white px-2.5 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-50"
                      >
                        詳細
                      </button>
                    </td>
                    <td className="border-b border-slate-100 px-2 py-3 text-center align-middle sm:px-3">
                      <button
                        type="button"
                        onClick={() => confirmDeleteRecord(row.date)}
                        className="rounded-md border border-rose-200 bg-white px-2.5 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50"
                      >
                        削除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {createRecordOpen && (
        <Modal title="記録を作成" onClose={closeCreateRecordModal} size="md">
          <div className="space-y-4">
            <label className="block text-sm text-slate-700">
              記録日
              <input
                type="date"
                value={createDate}
                onChange={(e) => setCreateDate(e.target.value)}
                className="mt-1 block w-full max-w-xs rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm text-slate-700">
              仮説（マークダウン）
              <textarea
                value={createHypothesis}
                onChange={(e) => setCreateHypothesis(e.target.value)}
                rows={12}
                spellCheck={false}
                placeholder={"この日の仮説（マークダウン可）\n# 見出し\n- 項目"}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm leading-relaxed"
              />
            </label>
            {createError && <p className="text-sm text-rose-700">{createError}</p>}
            <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={closeCreateRecordModal}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={saveCreateRecord}
                className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500"
              >
                保存
              </button>
            </div>
          </div>
        </Modal>
      )}

      {detailRow && (
        <Modal title={formatRecordDateJp(detailRow.date)} onClose={() => setDetailRow(null)} size="xl">
          <div className="grid max-h-[72vh] grid-cols-1 gap-3 overflow-y-auto pr-1 lg:grid-cols-3 lg:items-stretch">
            <DetailBlock title="仮説" body={detailRow.hypothesis} />
            <DetailBlock title="結果" body={detailRow.result} />
            <DetailBlock title="セクター調べ" body={detailRow.sectorResearch} />
          </div>
          <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-3">
            <button
              type="button"
              onClick={() => {
                confirmDeleteRecord(detailRow.date)
              }}
              className="rounded-lg border border-rose-200 bg-white px-3 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50"
            >
              削除
            </button>
            <button
              type="button"
              onClick={() => setDetailRow(null)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50"
            >
              閉じる
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

const MARKDOWN_DETAIL_CLASS =
  "min-h-0 min-w-0 text-sm text-slate-800 [&>*:first-child]:mt-0 [&_h1]:mb-2 [&_h1]:mt-3 [&_h1]:text-base [&_h1]:font-bold [&_h2]:mb-1.5 [&_h2]:mt-2.5 [&_h2]:text-sm [&_h2]:font-semibold [&_h3]:mb-1 [&_h3]:mt-2 [&_h3]:text-sm [&_h3]:font-semibold [&_p]:my-1.5 [&_p]:leading-relaxed [&_ul]:my-1.5 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-1.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-0.5 [&_blockquote]:my-2 [&_blockquote]:border-l-4 [&_blockquote]:border-slate-300 [&_blockquote]:pl-3 [&_blockquote]:text-slate-600 [&_code]:rounded [&_code]:bg-slate-100 [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-xs [&_pre]:my-2 [&_pre]:max-h-48 [&_pre]:overflow-auto [&_pre]:rounded-lg [&_pre]:bg-slate-100 [&_pre]:p-2 [&_pre]:font-mono [&_pre]:text-xs [&_a]:text-indigo-600 [&_a]:underline [&_hr]:my-3 [&_table]:my-2 [&_table]:w-full [&_table]:text-xs [&_th]:border [&_th]:border-slate-200 [&_th]:bg-slate-50 [&_th]:px-2 [&_th]:py-1 [&_th]:text-left [&_td]:border [&_td]:border-slate-200 [&_td]:px-2 [&_td]:py-1 [&_strong]:font-semibold"

function DetailBlock({ title, body }: { title: string; body: string }) {
  const t = body.trim()
  return (
    <section className="flex min-h-0 min-w-0 flex-col rounded-xl border border-slate-200 bg-slate-50/40 lg:max-h-[65vh]">
      <h4 className="shrink-0 border-b border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800">
        {title}
      </h4>
      <div className={`min-h-0 flex-1 overflow-y-auto p-3 ${t ? "bg-white" : ""}`}>
        {t ? (
          <div className={MARKDOWN_DETAIL_CLASS}>
            <ReactMarkdown>{body}</ReactMarkdown>
          </div>
        ) : (
          <p className="text-xs text-slate-400">（未入力）</p>
        )}
      </div>
    </section>
  )
}

/** 保存済み一覧の1列: ○/×と編集を横並び（装飾なしの記号のみ） */
function SavedColumnCell({
  text,
  label,
  onEdit,
}: {
  text: string
  label: string
  onEdit: () => void
}) {
  const filled = text.trim().length > 0
  return (
    <div className="flex flex-row flex-wrap items-center justify-center gap-2">
      <span
        className={`shrink-0 text-base font-semibold tabular-nums ${filled ? "text-emerald-600" : "text-slate-400"}`}
        title={filled ? `${label}あり` : `${label}なし`}
        aria-label={filled ? `${label}保存あり` : `${label}未入力`}
      >
        {filled ? "○" : "×"}
      </span>
      <button
        type="button"
        onClick={onEdit}
        className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
      >
        編集
      </button>
    </div>
  )
}

function today(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

/** `YYYY-MM-DD` → `YYYY年MM月DD日`（モーダルタイトル用） */
function formatRecordDateJp(isoDate: string): string {
  const parts = isoDate.split("-")
  if (parts.length !== 3) return isoDate
  const [y, mo, da] = parts
  const yn = Number(y)
  const mon = Number(mo)
  const dayn = Number(da)
  if (!Number.isFinite(yn) || !Number.isFinite(mon) || !Number.isFinite(dayn)) return isoDate
  return `${yn}年${String(mon).padStart(2, "0")}月${String(dayn).padStart(2, "0")}日`
}

/** 株プロンプト用。コピー時などに `recordedOnIso`（YYYY-MM-DD）基準で置換する */
function applyStockPromptPlaceholders(text: string, recordedOnIso: string): string {
  const jp = formatRecordDateJp(recordedOnIso)
  return text
    .replace(/\{\{\s*date_iso\s*\}\}/gi, recordedOnIso)
    .replace(/\{\{\s*date\s*\}\}/gi, jp)
    .replace(/\{\{\s*記録日\s*\}\}/g, jp)
}

function readRows(): StockDailyRow[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown[]
    if (!Array.isArray(parsed)) return []
    const out: StockDailyRow[] = []
    for (const item of parsed) {
      const row = normalizeStoredRow(item)
      if (row) out.push(row)
    }
    return out
  } catch {
    return []
  }
}

function normalizeStoredRow(item: unknown): StockDailyRow | null {
  if (item == null || typeof item !== "object") return null
  const o = item as Record<string, unknown>
  if (typeof o.id !== "string" || typeof o.date !== "string" || typeof o.createdAt !== "string") return null

  if (typeof o.hypothesis === "string" && typeof o.result === "string" && typeof o.sectorResearch === "string") {
    return {
      id: o.id,
      date: o.date,
      hypothesis: o.hypothesis,
      result: o.result,
      sectorResearch: o.sectorResearch,
      createdAt: o.createdAt,
    }
  }

  if (typeof o.content === "string") {
    return {
      id: o.id,
      date: o.date,
      hypothesis: o.content,
      result: "",
      sectorResearch: "",
      createdAt: o.createdAt,
    }
  }

  return null
}
