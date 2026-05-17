import { useCallback, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import {
  api,
  type AiScriptRow,
  type StockTradeEventRow,
  type StockTradeEventsQuery,
  type TradeType,
  type JudgmentType,
} from "../lib/api.ts"
import { apiErrorMessage } from "../lib/errors.ts"
import { useFetch } from "../lib/useFetch.ts"
import { Modal, FormError, FieldLabel, FormActions } from "../components/Modal.tsx"

export type StockTradesMode = "real" | "virtual-human" | "virtual-ai"

const MODE_CONFIG: Record<
  StockTradesMode,
  { title: string; trade_type: TradeType; judgment_type: JudgmentType; scriptFilter: boolean }
> = {
  real: { title: "実取引一覧", trade_type: "real", judgment_type: "human", scriptFilter: false },
  "virtual-human": { title: "仮想取引一覧（人間）", trade_type: "virtual", judgment_type: "human", scriptFilter: false },
  "virtual-ai": { title: "仮想取引一覧（AI）", trade_type: "virtual", judgment_type: "ai", scriptFilter: true },
}

type Tab = "all" | "entry" | "exit"

export function StockTradesPage({ mode }: { mode: StockTradesMode }) {
  const cfg = MODE_CONFIG[mode]
  const [tab, setTab] = useState<Tab>("all")
  const [settled, setSettled] = useState<"all" | "yes" | "no">("all")
  const [q, setQ] = useState("")
  const [qDraft, setQDraft] = useState("")
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [aiScriptId, setAiScriptId] = useState<string>("")

  const scriptsLoader = useCallback(() => (cfg.scriptFilter ? api.aiScripts() : Promise.resolve([])), [cfg.scriptFilter])
  const scriptsResult = useFetch(scriptsLoader)

  const query = useMemo((): StockTradeEventsQuery => {
    const qv: StockTradeEventsQuery = {
      trade_type: cfg.trade_type,
      judgment_type: cfg.judgment_type,
      event_kind: tab,
      settled: settled === "all" ? undefined : settled,
      q: q || undefined,
      from: from.trim() || undefined,
      to: to.trim() || undefined,
    }
    if (cfg.scriptFilter && aiScriptId !== "") {
      qv.ai_script_id = Number(aiScriptId)
    }
    return qv
  }, [cfg, tab, settled, q, from, to, aiScriptId])

  const eventsLoader = useCallback(() => api.stockTradeEvents(query), [query])
  const eventsResult = useFetch(eventsLoader)

  const [modal, setModal] = useState<
    | null
    | { type: "entry" }
    | { type: "exit" }
    | { type: "line" }
    | { type: "detail"; row: StockTradeEventRow }
  >(null)

  if (scriptsResult.status === "loading" && cfg.scriptFilter) {
    return <p className="text-slate-600">読み込み中…</p>
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-xl font-bold">{cfg.title}</h2>
        {cfg.scriptFilter && scriptsResult.status === "success" && (
          <label className="mb-3 flex max-w-md flex-col gap-1 text-sm">
            <span className="text-slate-600">AI スクリプト</span>
            <select
              value={aiScriptId}
              onChange={(e) => setAiScriptId(e.target.value)}
              className="rounded-lg border border-slate-300 px-2 py-1.5"
            >
              <option value="">全バージョン</option>
              {scriptsResult.data.map((s) => (
                <option key={s.id} value={String(s.id)}>
                  {s.version_name}
                </option>
              ))}
            </select>
          </label>
        )}
        <div className="mb-3 flex flex-wrap gap-2">
          {(
            [
              ["all", "全部"],
              ["entry", "エントリ"],
              ["exit", "イグジット"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`rounded-full px-3 py-1.5 text-sm ${
                tab === id ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="mb-4 flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-slate-600">約定</span>
            <select
              value={settled}
              onChange={(e) => setSettled(e.target.value as "all" | "yes" | "no")}
              className="rounded-lg border border-slate-300 px-2 py-1.5"
            >
              <option value="all">すべて</option>
              <option value="yes">約定済みのみ</option>
              <option value="no">未約定のみ</option>
            </select>
          </label>
          <form
            className="flex flex-wrap items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              setQ(qDraft.trim())
            }}
          >
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-slate-600">銘柄検索</span>
              <input
                value={qDraft}
                onChange={(e) => setQDraft(e.target.value)}
                className="w-40 rounded-lg border border-slate-300 px-2 py-1.5"
              />
            </label>
            <button type="submit" className="rounded-lg bg-slate-800 px-3 py-1.5 text-sm text-white hover:bg-slate-700">
              検索
            </button>
          </form>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-slate-600">期間 from</span>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1.5" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-slate-600">to</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1.5" />
          </label>
        </div>
        <div className="mb-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setModal({ type: "entry" })}
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm text-white hover:bg-indigo-500"
          >
            新規エントリー
          </button>
          <button
            type="button"
            onClick={() => setModal({ type: "exit" })}
            className="rounded-lg border border-indigo-600 px-3 py-1.5 text-sm text-indigo-700 hover:bg-indigo-50"
          >
            新規イグジット
          </button>
          <button
            type="button"
            onClick={() => setModal({ type: "line" })}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
          >
            ライン変更
          </button>
        </div>
        {eventsResult.status === "loading" && <p className="text-slate-600">イベントを読み込み中…</p>}
        {eventsResult.status === "error" && <p className="text-rose-600">{eventsResult.error.message}</p>}
        {eventsResult.status === "success" && (
          <>
            <p className="mb-3 text-lg font-semibold tabular-nums">
              合計損益（表示中・約定イグジット）:{" "}
              <span className={Number(eventsResult.data.total_realized_pl) >= 0 ? "text-emerald-700" : "text-rose-700"}>
                {eventsResult.data.total_realized_pl}
              </span>
            </p>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="py-2 pr-2">種別</th>
                    <th className="py-2 pr-2">日付</th>
                    <th className="py-2 pr-2">銘柄</th>
                    <th className="py-2 pr-2">概要</th>
                  </tr>
                </thead>
                <tbody>
                  {eventsResult.data.rows.map((row) => (
                    <tr
                      key={`${row.kind}-${row.id}`}
                      className="cursor-pointer border-b border-slate-100 hover:bg-slate-50"
                      onClick={() => setModal({ type: "detail", row })}
                    >
                      <td className="py-2 pr-2">{eventKindLabel(row.kind)}</td>
                      <td className="py-2 pr-2 tabular-nums">{row.sort_on}</td>
                      <td className="py-2 pr-2">
                        <Link
                          to={`/stocks/${row.stock.id}`}
                          className="text-indigo-600 hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {row.stock.name}
                        </Link>
                      </td>
                      <td className="max-w-md truncate py-2 pr-2 text-slate-700">{eventSummary(row)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {eventsResult.data.rows.length === 0 && <p className="py-6 text-center text-slate-500">データがありません</p>}
            </div>
          </>
        )}
      </section>

      {modal?.type === "detail" && (
        <EventDetailModal row={modal.row} onClose={() => setModal(null)} onSaved={() => eventsResult.refetch()} />
      )}
      {modal?.type === "entry" && (
        <QuickEntryModal
          cfg={cfg}
          aiScriptId={aiScriptId === "" ? null : Number(aiScriptId)}
          scripts={scriptsResult.status === "success" ? scriptsResult.data : []}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null)
            eventsResult.refetch()
          }}
        />
      )}
      {modal?.type === "exit" && (
        <QuickExitModal
          cfg={cfg}
          aiScriptId={aiScriptId === "" ? null : Number(aiScriptId)}
          scripts={scriptsResult.status === "success" ? scriptsResult.data : []}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null)
            eventsResult.refetch()
          }}
        />
      )}
      {modal?.type === "line" && (
        <QuickLineModal
          cfg={cfg}
          aiScriptId={aiScriptId === "" ? null : Number(aiScriptId)}
          scripts={scriptsResult.status === "success" ? scriptsResult.data : []}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null)
            eventsResult.refetch()
          }}
        />
      )}
    </div>
  )
}

function eventKindLabel(k: StockTradeEventRow["kind"]) {
  if (k === "entry") return "エントリ"
  if (k === "exit") return "イグジット"
  return "ライン"
}

function eventSummary(row: StockTradeEventRow) {
  if (row.kind === "entry") return row.entry_reason ?? ""
  if (row.kind === "exit") return row.exit_reason ?? ""
  return row.reason ?? ""
}

function EventDetailModal({
  row,
  onClose,
  onSaved,
}: {
  row: StockTradeEventRow
  onClose: () => void
  onSaved: () => void
}) {
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const del = async () => {
    if (!window.confirm("削除しますか？")) return
    setBusy(true)
    setErr(null)
    try {
      if (row.kind === "entry") await api.deleteEntry(row.id)
      else if (row.kind === "exit") await api.deleteStockExit(row.id)
      else await api.deleteLineChange(row.id)
      onSaved()
      onClose()
    } catch (e) {
      setErr(apiErrorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal title={`${eventKindLabel(row.kind)} #${row.id}`} onClose={onClose} size="lg">
      <pre className="max-h-64 overflow-auto rounded-lg bg-slate-50 p-3 text-xs">{JSON.stringify(row, null, 2)}</pre>
      <FormError message={err} />
      <div className="mt-4 flex justify-between gap-2">
        <button type="button" disabled={busy} onClick={del} className="rounded-lg border border-rose-300 px-3 py-2 text-sm text-rose-700 hover:bg-rose-50">
          削除
        </button>
        <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
          閉じる
        </button>
      </div>
    </Modal>
  )
}

function QuickEntryModal({
  cfg,
  aiScriptId,
  scripts,
  onClose,
  onSaved,
}: {
  cfg: (typeof MODE_CONFIG)[StockTradesMode]
  aiScriptId: number | null
  scripts: AiScriptRow[]
  onClose: () => void
  onSaved: () => void
}) {
  const [stockId, setStockId] = useState("")
  const [entryReason, setEntryReason] = useState("")
  const [shares, setShares] = useState("")
  const [expectedPrice, setExpectedPrice] = useState("")
  const [actualPrice, setActualPrice] = useState("")
  const [tradedAt, setTradedAt] = useState("")
  const [stopLoss, setStopLoss] = useState("")
  const [targetPrice, setTargetPrice] = useState("")
  const [err, setErr] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr(null)
    setSaving(true)
    try {
      const sid = Number(stockId)
      if (!Number.isFinite(sid)) throw new Error("銘柄 ID を数値で入力してください")
      const scriptId =
        cfg.judgment_type === "ai" ? (aiScriptId ?? (scripts[0] ? scripts[0].id : null)) : null
      if (cfg.judgment_type === "ai" && scriptId == null) throw new Error("AI スクリプトを選ぶか、一覧でスクリプトを絞り込んでください")

      const body: Record<string, unknown> = {
        stock_id: sid,
        trade_type: cfg.trade_type,
        judgment_type: cfg.judgment_type,
        ai_script_id: cfg.judgment_type === "ai" ? scriptId : null,
        entry_reason: entryReason,
        shares: shares ? Number(shares) : null,
        expected_price: expectedPrice || null,
        actual_price: actualPrice || null,
        traded_at: tradedAt || null,
      }
      if (stopLoss || targetPrice) {
        body.initial_line = { stop_loss: stopLoss || null, target_price: targetPrice || null, reason: null }
      }
      await api.createEntry(body)
      onSaved()
    } catch (e) {
      setErr(apiErrorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title="新規エントリー" onClose={onClose} size="lg">
      <form onSubmit={(e) => void submit(e)} className="space-y-3 text-sm">
        <label className="flex flex-col gap-1">
          <FieldLabel>銘柄 ID（一覧の URL 末尾）</FieldLabel>
          <input value={stockId} onChange={(e) => setStockId(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1.5" required />
        </label>
        <label className="flex flex-col gap-1">
          <FieldLabel>エントリー理由（必須）</FieldLabel>
          <textarea value={entryReason} onChange={(e) => setEntryReason(e.target.value)} className="min-h-20 rounded-lg border border-slate-300 px-2 py-1.5" required />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1">
            <FieldLabel>株数</FieldLabel>
            <input value={shares} onChange={(e) => setShares(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1.5" inputMode="numeric" />
          </label>
          <label className="flex flex-col gap-1">
            <FieldLabel>予定価格</FieldLabel>
            <input value={expectedPrice} onChange={(e) => setExpectedPrice(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1.5" />
          </label>
          <label className="flex flex-col gap-1">
            <FieldLabel>約定価格</FieldLabel>
            <input value={actualPrice} onChange={(e) => setActualPrice(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1.5" />
          </label>
          <label className="flex flex-col gap-1">
            <FieldLabel>約定日</FieldLabel>
            <input type="date" value={tradedAt} onChange={(e) => setTradedAt(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1.5" />
          </label>
        </div>
        <p className="text-xs text-slate-500">初期ライン（任意）: 入力すると line_changes にも同時登録されます。</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1">
            <FieldLabel>損切りライン</FieldLabel>
            <input value={stopLoss} onChange={(e) => setStopLoss(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1.5" />
          </label>
          <label className="flex flex-col gap-1">
            <FieldLabel>目標価格</FieldLabel>
            <input value={targetPrice} onChange={(e) => setTargetPrice(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1.5" />
          </label>
        </div>
        <FormError message={err} />
        <FormActions onCancel={onClose} submitting={saving} />
      </form>
    </Modal>
  )
}

function QuickExitModal({
  cfg,
  aiScriptId,
  scripts,
  onClose,
  onSaved,
}: {
  cfg: (typeof MODE_CONFIG)[StockTradesMode]
  aiScriptId: number | null
  scripts: AiScriptRow[]
  onClose: () => void
  onSaved: () => void
}) {
  const [stockId, setStockId] = useState("")
  const [exitReason, setExitReason] = useState("")
  const [shares, setShares] = useState("")
  const [expectedPrice, setExpectedPrice] = useState("")
  const [actualPrice, setActualPrice] = useState("")
  const [tradedAt, setTradedAt] = useState("")
  const [err, setErr] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr(null)
    setSaving(true)
    try {
      const sid = Number(stockId)
      if (!Number.isFinite(sid)) throw new Error("銘柄 ID を数値で入力してください")
      const scriptId =
        cfg.judgment_type === "ai" ? (aiScriptId ?? (scripts[0] ? scripts[0].id : null)) : null
      if (cfg.judgment_type === "ai" && scriptId == null) throw new Error("AI スクリプトを選んでください")

      await api.createStockExit({
        stock_id: sid,
        trade_type: cfg.trade_type,
        judgment_type: cfg.judgment_type,
        ai_script_id: cfg.judgment_type === "ai" ? scriptId : null,
        exit_reason: exitReason,
        shares: shares ? Number(shares) : null,
        expected_price: expectedPrice || null,
        actual_price: actualPrice || null,
        traded_at: tradedAt || null,
      })
      onSaved()
    } catch (e) {
      setErr(apiErrorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title="新規イグジット" onClose={onClose} size="lg">
      <form onSubmit={(e) => void submit(e)} className="space-y-3 text-sm">
        <label className="flex flex-col gap-1">
          <FieldLabel>銘柄 ID</FieldLabel>
          <input value={stockId} onChange={(e) => setStockId(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1.5" required />
        </label>
        <label className="flex flex-col gap-1">
          <FieldLabel>イグジット理由（必須）</FieldLabel>
          <textarea value={exitReason} onChange={(e) => setExitReason(e.target.value)} className="min-h-20 rounded-lg border border-slate-300 px-2 py-1.5" required />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1">
            <FieldLabel>株数</FieldLabel>
            <input value={shares} onChange={(e) => setShares(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1.5" />
          </label>
          <label className="flex flex-col gap-1">
            <FieldLabel>予定価格</FieldLabel>
            <input value={expectedPrice} onChange={(e) => setExpectedPrice(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1.5" />
          </label>
          <label className="flex flex-col gap-1">
            <FieldLabel>約定価格</FieldLabel>
            <input value={actualPrice} onChange={(e) => setActualPrice(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1.5" />
          </label>
          <label className="flex flex-col gap-1">
            <FieldLabel>約定日</FieldLabel>
            <input type="date" value={tradedAt} onChange={(e) => setTradedAt(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1.5" />
          </label>
        </div>
        <FormError message={err} />
        <FormActions onCancel={onClose} submitting={saving} />
      </form>
    </Modal>
  )
}

function QuickLineModal({
  cfg,
  aiScriptId,
  scripts,
  onClose,
  onSaved,
}: {
  cfg: (typeof MODE_CONFIG)[StockTradesMode]
  aiScriptId: number | null
  scripts: AiScriptRow[]
  onClose: () => void
  onSaved: () => void
}) {
  const [stockId, setStockId] = useState("")
  const [changedOn, setChangedOn] = useState(() => new Date().toISOString().slice(0, 10))
  const [stopLoss, setStopLoss] = useState("")
  const [targetPrice, setTargetPrice] = useState("")
  const [reason, setReason] = useState("")
  const [err, setErr] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr(null)
    setSaving(true)
    try {
      const sid = Number(stockId)
      if (!Number.isFinite(sid)) throw new Error("銘柄 ID を数値で入力してください")
      const scriptId =
        cfg.judgment_type === "ai" ? (aiScriptId ?? (scripts[0] ? scripts[0].id : null)) : null
      if (cfg.judgment_type === "ai" && scriptId == null) throw new Error("AI スクリプトを選んでください")

      await api.createLineChange({
        stock_id: sid,
        trade_type: cfg.trade_type,
        judgment_type: cfg.judgment_type,
        ai_script_id: cfg.judgment_type === "ai" ? scriptId : null,
        changed_on: changedOn,
        stop_loss: stopLoss || null,
        target_price: targetPrice || null,
        reason: reason || null,
      })
      onSaved()
    } catch (e) {
      setErr(apiErrorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title="ライン変更" onClose={onClose} size="lg">
      <form onSubmit={(e) => void submit(e)} className="space-y-3 text-sm">
        <label className="flex flex-col gap-1">
          <FieldLabel>銘柄 ID</FieldLabel>
          <input value={stockId} onChange={(e) => setStockId(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1.5" required />
        </label>
        <label className="flex flex-col gap-1">
          <FieldLabel>変更日</FieldLabel>
          <input type="date" value={changedOn} onChange={(e) => setChangedOn(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1.5" required />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1">
            <FieldLabel>損切り</FieldLabel>
            <input value={stopLoss} onChange={(e) => setStopLoss(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1.5" />
          </label>
          <label className="flex flex-col gap-1">
            <FieldLabel>目標</FieldLabel>
            <input value={targetPrice} onChange={(e) => setTargetPrice(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1.5" />
          </label>
        </div>
        <label className="flex flex-col gap-1">
          <FieldLabel>理由</FieldLabel>
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} className="min-h-16 rounded-lg border border-slate-300 px-2 py-1.5" />
        </label>
        <FormError message={err} />
        <FormActions onCancel={onClose} submitting={saving} />
      </form>
    </Modal>
  )
}
