import type { FormEvent } from "react"
import { useMemo, useState } from "react"

type TodoItem = {
  id: string
  title: string
  done: boolean
  createdAt: string
}

const STORAGE_KEY = "solarc:todos:v1"

export function DashboardPage() {
  const [todos, setTodos] = useState<TodoItem[]>(() => readTodos())
  const [input, setInput] = useState("")

  const remainingCount = useMemo(() => todos.filter((todo) => !todo.done).length, [todos])

  const saveTodos = (next: TodoItem[]) => {
    setTodos(next)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  }

  const addTodo = (event: FormEvent) => {
    event.preventDefault()
    const title = input.trim()
    if (!title) return
    const next: TodoItem[] = [
      {
        id: crypto.randomUUID(),
        title,
        done: false,
        createdAt: new Date().toISOString(),
      },
      ...todos,
    ]
    saveTodos(next)
    setInput("")
  }

  const toggleTodo = (id: string) => {
    const next = todos.map((todo) => (todo.id === id ? { ...todo, done: !todo.done } : todo))
    saveTodos(next)
  }

  const removeTodo = (id: string) => {
    saveTodos(todos.filter((todo) => todo.id !== id))
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-bold">ダッシュボード</h2>
        <p className="mt-2 text-sm text-indigo-700">未完了: {remainingCount}件</p>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <form onSubmit={addTodo} className="flex flex-col gap-2 sm:flex-row">
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="例: 前場後に保有株の見直しをする"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
          >
            追加
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        {todos.length === 0 ? (
          <p className="text-sm text-slate-500">まだTODOがありません。</p>
        ) : (
          <ul className="space-y-2">
            {todos.map((todo) => (
              <li
                key={todo.id}
                className="flex flex-col gap-2 rounded-lg border border-slate-200 p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={todo.done} onChange={() => toggleTodo(todo.id)} />
                  <span className={todo.done ? "text-slate-400 line-through" : "text-slate-700"}>{todo.title}</span>
                </label>
                <button
                  type="button"
                  onClick={() => removeTodo(todo.id)}
                  className="self-start rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50 sm:self-auto"
                >
                  削除
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function readTodos(): TodoItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as TodoItem[]
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (item) =>
        item != null &&
        typeof item.id === "string" &&
        typeof item.title === "string" &&
        typeof item.done === "boolean" &&
        typeof item.createdAt === "string",
    )
  } catch {
    return []
  }
}
