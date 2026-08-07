import { createContext, useContext, useState, useCallback, useRef } from 'react'
import { AlertTriangle } from 'lucide-react'

const ConfirmContext = createContext(null)

const sans = { fontFamily: 'var(--font-sans)', fontWeight: 500 }
const serif = { fontFamily: 'var(--font-serif)' }

/**
 * Wraps the whole app (see App.jsx) so any destructive action can await
 * confirm(...) for an in-theme bottom-sheet dialog instead of the browser's
 * native window.confirm(), which looks and behaves like it belongs to a
 * different app entirely (unstyled, blocks the whole tab, no branding).
 */
export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null)
  const resolveRef = useRef(null)

  const confirm = useCallback((message, opts = {}) => {
    return new Promise((resolve) => {
      resolveRef.current = resolve
      setState({ message, title: opts.title || 'Are you sure?', confirmLabel: opts.confirmLabel || 'Delete', danger: opts.danger !== false })
    })
  }, [])

  const settle = (result) => {
    resolveRef.current?.(result)
    setState(null)
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state && (
        <div onClick={() => settle(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 300 }}>
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--bg-modal)',
              border: '0.5px solid var(--border)',
              borderRadius: '20px 20px 0 0',
              padding: '24px 20px',
              width: '100%',
              maxWidth: 430,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 14,
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: state.danger ? 'var(--tier-red-bg)' : 'var(--tier-purple-bg)',
                border: `1px solid ${state.danger ? 'var(--tier-red-border)' : 'var(--tier-purple-border)'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AlertTriangle size={26} color={state.danger ? 'var(--tier-red)' : 'var(--tier-purple)'} strokeWidth={2} />
            </div>
            <div style={{ ...serif, fontWeight: 700, fontSize: 18, color: 'var(--text-heading)' }}>{state.title}</div>
            <div style={{ fontSize: 14, color: 'var(--text-secondary)', ...sans, lineHeight: 1.6 }}>{state.message}</div>
            <div style={{ display: 'flex', gap: 10, width: '100%', marginTop: 6 }}>
              <button
                onClick={() => settle(false)}
                className="stackd-press"
                style={{
                  flex: 1,
                  background: 'none',
                  border: '0.5px solid var(--border-strong)',
                  color: 'var(--text-input)',
                  borderRadius: 20,
                  padding: '13px 0',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  ...sans,
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => settle(true)}
                className="stackd-press"
                style={{
                  flex: 1,
                  background: state.danger ? 'var(--tier-red)' : 'var(--tier-purple)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 20,
                  padding: '13px 0',
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: 'pointer',
                  ...sans,
                }}
              >
                {state.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  )
}

/** @returns {(message: string, opts?: { title?: string, confirmLabel?: string, danger?: boolean }) => Promise<boolean>} */
export function useConfirm() {
  const confirm = useContext(ConfirmContext)
  if (!confirm) throw new Error('useConfirm must be used within a ConfirmProvider')
  return confirm
}
