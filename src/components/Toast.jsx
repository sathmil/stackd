import { createContext, useContext, useState, useCallback, useRef } from 'react'

const ToastContext = createContext(null)

const sans = { fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', fontWeight: 500 }

/**
 * Wraps the whole app (see App.jsx) so any page can call useToast() for
 * transient success/error feedback, without every write path inventing its
 * own local "show a message for a bit" state.
 */
export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null)
  const timeoutRef = useRef(null)

  const showToast = useCallback((message, type = 'success') => {
    clearTimeout(timeoutRef.current)
    setToast({ message, type })
    timeoutRef.current = setTimeout(() => setToast(null), 2500)
  }, [])

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      {toast && (
        <div
          style={{
            position: 'absolute',
            left: '50%',
            bottom: 88,
            transform: 'translateX(-50%)',
            background: toast.type === 'error' ? '#2a1010' : '#181818',
            border: `0.5px solid ${toast.type === 'error' ? '#3a1a1a' : '#2a2a2a'}`,
            color: toast.type === 'error' ? '#ff6b6b' : '#e8e4dc',
            borderRadius: 20,
            padding: '10px 18px',
            fontSize: 14,
            ...sans,
            maxWidth: '85%',
            textAlign: 'center',
            zIndex: 200,
            boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
          }}
        >
          {toast.message}
        </div>
      )}
    </ToastContext.Provider>
  )
}

/** @returns {(message: string, type?: 'success'|'error') => void} */
export function useToast() {
  const showToast = useContext(ToastContext)
  if (!showToast) throw new Error('useToast must be used within a ToastProvider')
  return showToast
}
