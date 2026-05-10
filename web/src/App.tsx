import { useEffect, useState } from "react"
import { NavLink, Route, Routes } from "react-router-dom"
import { api } from "./lib/api.ts"
import { isSupabaseConfigured, supabase } from "./lib/supabase.ts"
import { LoginPage } from "./pages/LoginPage.tsx"
import { DashboardPage } from "./pages/DashboardPage.tsx"
import { MastersPage } from "./pages/MastersPage.tsx"
import { SettingsPage } from "./pages/SettingsPage.tsx"

const navItems = [
  { to: "/", label: "ダッシュボード" },
  { to: "/masters", label: "支出・収入" },
  { to: "/settings", label: "設定" },
]
const IS_DEV = import.meta.env.DEV

type InitialAuth = {
  status: "loading" | "authenticated" | "guest"
  error: string | null
}

const INITIAL_AUTH: InitialAuth = resolveInitialAuth()

export default function App() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [authStatus, setAuthStatus] = useState<"loading" | "authenticated" | "guest">(
    IS_DEV ? "authenticated" : INITIAL_AUTH.status,
  )
  const [authError, setAuthError] = useState<string | null>(INITIAL_AUTH.error)
  const closeDrawer = () => setDrawerOpen(false)

  useEffect(() => {
    if (IS_DEV) return
    if (!supabase) return
    const client = supabase

    let active = true
    const verify = async () => {
      try {
        const { data } = await client.auth.getSession()
        if (!active) return
        if (!data.session?.access_token) {
          setAuthError(null)
          setAuthStatus("guest")
          return
        }
        await api.me()
        if (!active) return
        setAuthError(null)
        setAuthStatus("authenticated")
      } catch {
        if (!active) return
        setAuthError("ログインできませんでした")
        setAuthStatus("guest")
      }
    }

    void verify()
    const { data: listener } = client.auth.onAuthStateChange(() => {
      void verify()
    })

    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [])

  if (authStatus === "loading") {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-7xl items-center justify-center p-6 text-slate-600">
        認証を確認中…
      </div>
    )
  }

  if (authStatus === "guest") {
    return <LoginPage errorMessage={authError ?? undefined} />
  }

  return (
    <div className="mx-auto min-h-screen w-full max-w-7xl p-4 text-slate-800 sm:p-6">
      <header className="mb-4 flex items-center gap-3 lg:hidden">
        <button
          type="button"
          aria-label="メニューを開く"
          onClick={() => setDrawerOpen(true)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 bg-white shadow-sm hover:bg-slate-50"
        >
          <span className="sr-only">メニュー</span>
          <span aria-hidden="true" className="text-lg leading-none">≡</span>
        </button>
        <h1 className="text-base font-bold">SOLARC</h1>
      </header>

      <div className="grid gap-4 lg:grid-cols-[220px_1fr] lg:items-start">
        <aside className="hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:sticky lg:top-6 lg:block lg:h-[calc(100vh-3rem)] lg:overflow-y-auto">
          <SidebarHeader />
          <SidebarNav onNavigate={closeDrawer} />
        </aside>

        <section className="min-w-0">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/masters" element={<MastersPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </section>
      </div>

      {drawerOpen && (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          <div
            className="absolute inset-0 bg-slate-900/40"
            onClick={closeDrawer}
            aria-hidden="true"
          />
          <aside className="relative z-10 flex h-full w-64 flex-col bg-white p-4 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <SidebarHeader />
              <button
                type="button"
                aria-label="メニューを閉じる"
                onClick={closeDrawer}
                className="text-2xl leading-none text-slate-400 hover:text-slate-600"
              >
                ×
              </button>
            </div>
            <SidebarNav onNavigate={closeDrawer} />
          </aside>
        </div>
      )}
    </div>
  )
}

function SidebarHeader() {
  return (
    <div>
      <h1 className="mb-4 text-lg font-bold">SOLARC</h1>
    </div>
  )
}

function SidebarNav({ onNavigate }: { onNavigate: () => void }) {
  return (
    <nav className="space-y-1">
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === "/"}
          onClick={onNavigate}
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
  )
}

function resolveInitialAuth(): InitialAuth {
  if (!IS_DEV && !isSupabaseConfigured) {
    return {
      status: "guest",
      error: "Supabase の設定が不足しています",
    }
  }

  return {
    status: "loading",
    error: null,
  }
}
