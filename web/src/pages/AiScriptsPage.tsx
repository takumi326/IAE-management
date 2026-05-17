import { useCallback, useState } from "react"
import { api, type AiScriptRow } from "../lib/api.ts"
import { apiErrorMessage } from "../lib/errors.ts"
import { useFetch } from "../lib/useFetch.ts"
import { Modal, FormError, FieldLabel } from "../components/Modal.tsx"

export function AiScriptsPage() {
  const loader = useCallback(() => api.aiScripts(), [])
  const result = useFetch(loader)
  const [editing, setEditing] = useState<AiScriptRow | "new" | null>(null)

  if (result.status === "loading") return <p className="text-slate-600">読み込み中…</p>
  if (result.status === "error") return <p className="text-rose-600">{result.error.message}</p>

  const rows = result.data

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="text-xl font-bold">AI スクリプト一覧</h2>
          <button
            type="button"
            onClick={() => setEditing("new")}
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm text-white hover:bg-indigo-500"
          >
            新規
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="py-2 pr-3">バージョン</th>
                <th className="py-2 pr-3">運用期間</th>
                <th className="py-2 pr-3">概要</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="cursor-pointer border-b border-slate-100 hover:bg-slate-50" onClick={() => setEditing(r)}>
                  <td className="py-2 pr-3 font-medium">{r.version_name}</td>
                  <td className="py-2 pr-3 tabular-nums text-slate-600">
                    {r.started_at}
                    {r.ended_at ? ` 〜 ${r.ended_at}` : " 〜 運用中"}
                  </td>
                  <td className="max-w-md truncate py-2 pr-3 text-slate-700">{r.description ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && <p className="py-6 text-center text-slate-500">まだ登録がありません</p>}
        </div>
      </section>

      {editing && (
        <AiScriptFormModal
          existing={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            result.refetch()
          }}
        />
      )}
    </div>
  )
}

function AiScriptFormModal({
  existing,
  onClose,
  onSaved,
}: {
  existing: AiScriptRow | null
  onClose: () => void
  onSaved: () => void
}) {
  const [versionName, setVersionName] = useState(existing?.version_name ?? "")
  const [description, setDescription] = useState(existing?.description ?? "")
  const [scope, setScope] = useState(existing?.scope ?? "")
  const [startedAt, setStartedAt] = useState(existing?.started_at?.slice(0, 10) ?? new Date().toISOString().slice(0, 10))
  const [endedAt, setEndedAt] = useState(existing?.ended_at?.slice(0, 10) ?? "")
  const [err, setErr] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setErr(null)
    try {
      if (existing) {
        await api.updateAiScript(existing.id, {
          version_name: versionName,
          description: description || null,
          scope: scope || null,
          started_at: startedAt,
          ended_at: endedAt || null,
        })
      } else {
        await api.createAiScript({
          version_name: versionName,
          description: description || null,
          scope: scope || null,
          started_at: startedAt,
          ended_at: endedAt || null,
        })
      }
      onSaved()
    } catch (e) {
      setErr(apiErrorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  const del = async () => {
    if (!existing) return
    if (!window.confirm("削除しますか？紐づく取引の参照が外れます。")) return
    setSaving(true)
    setErr(null)
    try {
      await api.deleteAiScript(existing.id)
      onSaved()
    } catch (e) {
      setErr(apiErrorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={existing ? "AI スクリプトを編集" : "AI スクリプトを追加"} onClose={onClose} size="lg">
      <form onSubmit={(e) => void save(e)} className="space-y-3 text-sm">
        <label className="flex flex-col gap-1">
          <FieldLabel>version_name（一意）</FieldLabel>
          <input value={versionName} onChange={(e) => setVersionName(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1.5" required />
        </label>
        <label className="flex flex-col gap-1">
          <FieldLabel>description</FieldLabel>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-20 rounded-lg border border-slate-300 px-2 py-1.5" />
        </label>
        <label className="flex flex-col gap-1">
          <FieldLabel>scope</FieldLabel>
          <textarea value={scope} onChange={(e) => setScope(e.target.value)} className="min-h-16 rounded-lg border border-slate-300 px-2 py-1.5" />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1">
            <FieldLabel>started_at</FieldLabel>
            <input type="date" value={startedAt} onChange={(e) => setStartedAt(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1.5" required />
          </label>
          <label className="flex flex-col gap-1">
            <FieldLabel>ended_at（運用終了時）</FieldLabel>
            <input type="date" value={endedAt} onChange={(e) => setEndedAt(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1.5" />
          </label>
        </div>
        <FormError message={err} />
        <div className="flex justify-between gap-2 pt-2">
          {existing && (
            <button type="button" disabled={saving} onClick={() => void del()} className="rounded-lg border border-rose-300 px-3 py-2 text-sm text-rose-700">
              削除
            </button>
          )}
          <div className="ml-auto flex gap-2">
            <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
              キャンセル
            </button>
            <button type="submit" disabled={saving} className="rounded-lg bg-indigo-600 px-3 py-2 text-sm text-white disabled:opacity-60">
              {saving ? "保存中…" : "保存"}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  )
}
