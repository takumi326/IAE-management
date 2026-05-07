const majors = [
  { kind: "expense", name: "食費" },
  { kind: "expense", name: "サブスク" },
  { kind: "income", name: "給与" },
]

const minors = [
  { major: "食費", name: "外食" },
  { major: "食費", name: "UberEats" },
  { major: "給与", name: "base_salary" },
]

export function CategoriesPage() {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold">大カテゴリ</h2>
        <ul className="space-y-2">
          {majors.map((major) => (
            <li key={`${major.kind}-${major.name}`} className="flex items-center justify-between rounded-lg border border-slate-200 p-3 text-sm">
              <span>{major.name}</span>
              <span className="text-slate-500">{major.kind}</span>
            </li>
          ))}
        </ul>
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold">小カテゴリ</h2>
        <ul className="space-y-2">
          {minors.map((minor) => (
            <li key={`${minor.major}-${minor.name}`} className="flex items-center justify-between rounded-lg border border-slate-200 p-3 text-sm">
              <span>{minor.name}</span>
              <span className="text-slate-500">{minor.major}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
