import { useEffect, useState } from "react"

type State<T> =
  | { status: "loading"; data: null; error: null }
  | { status: "success"; data: T; error: null }
  | { status: "error"; data: null; error: Error }

export function useFetch<T>(loader: () => Promise<T>): State<T> {
  const [state, setState] = useState<State<T>>({ status: "loading", data: null, error: null })

  useEffect(() => {
    let cancelled = false

    loader()
      .then((data) => {
        if (cancelled) return
        setState({ status: "success", data, error: null })
      })
      .catch((error: unknown) => {
        if (cancelled) return
        const err = error instanceof Error ? error : new Error(String(error))
        setState({ status: "error", data: null, error: err })
      })

    return () => {
      cancelled = true
    }
  }, [loader])

  return state
}
