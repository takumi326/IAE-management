export function ImportPage() {
  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-bold">インポート</h2>
        <p className="mt-1 text-sm text-slate-500">JSON 貼り付け または CSV アップロードで実績を一括登録</p>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold">JSON 貼り付け</h3>
          <p className="mt-1 text-xs text-slate-500">Claude の解析結果をそのまま貼り付け</p>
          <textarea
            rows={10}
            placeholder='[{"month":"2026-05","category":"食費","amount":3500,"payment":"PayPay"}]'
            className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono"
          />
          <div className="mt-3 flex justify-end gap-2">
            <button className="rounded-lg border border-slate-300 px-3 py-2 text-sm">プレビュー</button>
            <button className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white">取込実行</button>
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold">CSV アップロード</h3>
          <p className="mt-1 text-xs text-slate-500">カード明細・銀行明細などを一括登録</p>
          <input type="file" accept=".csv" className="mt-3 w-full text-sm" />
          <div className="mt-3 flex justify-end gap-2">
            <button className="rounded-lg border border-slate-300 px-3 py-2 text-sm">プレビュー</button>
            <button className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white">取込実行</button>
          </div>
        </article>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-lg font-semibold">取込結果プレビュー</h3>
        <p className="mt-2 text-sm text-slate-500">
          ここにバリデーション結果（行番号付きエラー表示）と、登録予定レコードの一覧が並ぶ予定。
        </p>
      </section>
    </div>
  )
}
