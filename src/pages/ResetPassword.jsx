import { useState } from 'react'
import { supabase } from '../supabaseClient'

const serif = { fontFamily: 'Georgia, "Times New Roman", serif' }
const sans  = { fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }

export default function ResetPassword({ onDone }) {
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone]         = useState(false)

  const handleSubmit = async () => {
    setError('')
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return }

    setSubmitting(true)
    const { error: updateError } = await supabase.auth.updateUser({ password })
    setSubmitting(false)
    if (updateError) setError(updateError.message)
    else setDone(true)
  }

  const inputStyle = {
    background: '#1a1a1a', border: '0.5px solid #252525', borderRadius: 8,
    padding: '11px 13px', fontSize: 14, color: '#ccc', outline: 'none', width: '100%', ...sans,
  }

  return (
    <div style={{ minHeight: '100dvh', background: '#111', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 20px' }}>
      <div style={{ width: '100%', maxWidth: 380, background: '#181818', border: '0.5px solid #222', borderRadius: 16, padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ ...serif, fontSize: 16, color: '#e8e4dc' }}>Set a new password</div>

        {done ? (
          <>
            <div style={{ fontSize: 13, color: '#888', ...sans, lineHeight: 1.6 }}>Your password has been updated.</div>
            <button onClick={onDone} style={{ background: '#f0ece4', color: '#111', borderRadius: 20, padding: '13px 0', fontSize: 14, fontWeight: 500, border: 'none', cursor: 'pointer', ...serif }}>
              Continue
            </button>
          </>
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 11, color: '#555', ...sans }}>New password</label>
              <input type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} style={inputStyle} />
            </div>
            {error && <div style={{ fontSize: 12, color: '#ff6b6b', ...sans }}>{error}</div>}
            <button onClick={handleSubmit} disabled={submitting} style={{ background: '#f0ece4', color: '#111', borderRadius: 20, padding: '13px 0', fontSize: 14, fontWeight: 500, border: 'none', cursor: submitting ? 'default' : 'pointer', opacity: submitting ? 0.6 : 1, ...serif }}>
              {submitting ? 'Please wait...' : 'Update password'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
