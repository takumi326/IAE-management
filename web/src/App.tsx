import { NavLink, Route, Routes } from "react-router-dom"
import { CategoriesPage } from "./pages/CategoriesPage.tsx"
import { DashboardPage } from "./pages/DashboardPage.tsx"
import { ExpenseMastersPage } from "./pages/ExpenseMastersPage.tsx"
import { ForecastsPage } from "./pages/ForecastsPage.tsx"
import { IncomeMastersPage } from "./pages/IncomeMastersPage.tsx"
import { PaymentMethodsPage } from "./pages/PaymentMethodsPage.tsx"
import { TransactionsPage } from "./pages/TransactionsPage.tsx"

const navItems = [
  { to: "/", label: "ダッシュボード" },
  { to: "/forecasts", label: "予測管理" },
  { to: "/transactions", label: "実績管理" },
  { to: "/masters/expenses", label: "支出マスタ" },
  { to: "/masters/incomes", label: "収入マスタ" },
  { to: "/masters/categories", label: "カテゴリ管理" },
  { to: "/masters/payment-methods", label: "支払方法管理" },
]

export default function App() {
  return (
    <div className="mx-auto min-h-screen w-full max-w-7xl p-4 text-slate-800 sm:p-6">
      <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
        <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <nav className="space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  `block rounded-lg px-3 py-2 text-sm ${
                    isActive ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-100"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </aside>

        <section>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/forecasts" element={<ForecastsPage />} />
            <Route path="/transactions" element={<TransactionsPage />} />
            <Route path="/masters/expenses" element={<ExpenseMastersPage />} />
            <Route path="/masters/incomes" element={<IncomeMastersPage />} />
            <Route path="/masters/categories" element={<CategoriesPage />} />
            <Route path="/masters/payment-methods" element={<PaymentMethodsPage />} />
          </Routes>
        </section>
      </div>
    </div>
  )
}
