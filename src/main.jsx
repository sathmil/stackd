import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { initErrorTracking, Sentry } from './lib/errorTracking'

initErrorTracking()

function ErrorFallback() {
  return (
    <div
      style={{
        height: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#111',
        color: '#888',
        fontFamily: 'sans-serif',
        fontSize: 15,
        textAlign: 'center',
        padding: 24,
      }}
    >
      Something went wrong. Please refresh the page.
    </div>
  )
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Sentry.ErrorBoundary fallback={<ErrorFallback />}>
      <App />
    </Sentry.ErrorBoundary>
  </StrictMode>,
)
