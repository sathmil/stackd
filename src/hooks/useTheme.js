import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'stackd-theme'

function getInitialTheme() {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === 'light' || stored === 'dark') return stored
  // No stored preference yet -- fall back to the OS/browser preference
  // rather than always defaulting to dark, so a light-mode system doesn't
  // get surprised on first visit.
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

/**
 * Reads/writes the app's dark/light theme, persisted in localStorage and
 * applied via a `data-theme` attribute on <html> (index.css defines the
 * light overrides under `:root[data-theme="light"]`).
 * @returns {['light'|'dark', () => void]}
 */
export function useTheme() {
  const [theme, setTheme] = useState(getInitialTheme)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem(STORAGE_KEY, theme)
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.setAttribute('content', theme === 'light' ? '#faf8f5' : '#f90505')
  }, [theme])

  const toggleTheme = useCallback(() => {
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'))
  }, [])

  return [theme, toggleTheme]
}
