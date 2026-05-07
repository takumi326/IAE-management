const methods = [
  { name: "PayPay", type: "card" },
  { name: "三井住友カード", type: "card" },
  { name: "住信SBI", type: "bank_debit" },
]

export function PaymentMethodsPage() {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-3 text-lg font-semibold">支払方法管理</h2>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {methods.map((method) => (
          <article key={method.name} className="rounded-lg border border-slate-200 p-3">
            <p className="text-sm font-medium">{method.name}</p>
            <p className="mt-1 text-xs text-slate-500">{method.type}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
