import { useState, useEffect, useCallback } from 'react'

/**
 * Runs an async fetcher and exposes { data, loading, error, refetch } --
 * shared by every data-fetching page instead of each reimplementing
 * loading/error state by hand.
 * @param {() => Promise<{ data: any, error: any }>} fetcher
 * @param {any[]} deps
 */
export function useAsync(fetcher, deps = []) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const run = useCallback(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    fetcher().then(({ data, error }) => {
      if (cancelled) return
      if (error) setError(error)
      else setData(data)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  useEffect(() => run(), [run])

  return { data, loading, error, refetch: run }
}
