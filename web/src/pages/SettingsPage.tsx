export function SettingsPage() {
  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-bold">設定</h2>
        <p className="mt-1 text-sm text-slate-500">将来の拡張用。MVPではプレースホルダ。</p>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-lg font-semibold">予測初期値</h3>
        <p className="mt-1 text-xs text-slate-500">直近Nヶ月平均で支出予測を初期化する設定</p>
        <label className="mt-3 inline-flex items-center gap-2 text-sm">
          <span>直近</span>
          <input
            type="number"
            defaultValue={3}
            min={1}
            max={12}
            className="w-16 rounded-lg border border-slate-300 px-2 py-1 text-sm"
          />
          <span>ヶ月</span>
        </label>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-lg font-semibold">アカウント</h3>
        <p className="mt-1 text-xs text-slate-500">Google OAuth 連携（MVP予定）</p>
        <button className="mt-3 rounded-lg border border-slate-300 px-3 py-2 text-sm">サインアウト</button>
      </section>
    </div>
  )
}
