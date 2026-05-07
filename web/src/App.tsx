import { NavLink, Route, Routes } from "react-router-dom"
import { DashboardPage } from "./pages/DashboardPage.tsx"
import { ImportPage } from "./pages/ImportPage.tsx"
import { MastersPage } from "./pages/MastersPage.tsx"
import { SettingsPage } from "./pages/SettingsPage.tsx"

const navItems = [
  { to: "/", label: "ダッシュボード" },
  { to: "/masters", label: "マスタ設定" },
  { to: "/import", label: "インポート" },
  { to: "/settings", label: "設定" },
]

export default function App() {
  return (
    <div className="mx-auto min-h-screen w-full max-w-7xl p-4 text-slate-800 sm:p-6">
      <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
        <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h1 className="mb-1 text-lg font-bold">IAE Management</h1>
          <p className="mb-4 text-xs text-slate-500">収支管理ダッシュボード</p>
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
            <Route path="/masters" element={<MastersPage />} />
            <Route path="/import" element={<ImportPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </section>
      </div>
    </div>
  )
}
