import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const serif = { fontFamily: 'Georgia, "Times New Roman", serif' }
const sans = { fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }

const cardStyle = { width: '100%', maxWidth: 380, background: '#181818', border: '0.5px solid #222', borderRadius: 16, padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 16 }
const buttonStyle = { background: '#f0ece4', color: '#111', borderRadius: 20, padding: '13px 0', fontSize: 14, fontWeight: 500, border: 'none', cursor: 'pointer', ...serif }

export default function ResetPassword({ onDone }) {
  // Supabase's recovery email links point at their own /verify endpoint
  // first, which is exactly what an email security gateway that
  // pre-scans links (e.g. Stanford's Proofpoint URL Defense) triggers,
  // silently burning the one-time token before a real click ever happens.
  // The documented mitigation: point the email link at this app instead,
  // carrying a token_hash that is NOT consumed until this app explicitly
  // calls verifyOtp -- gated behind a real button click, since an
  // automated scanner fetching the page never clicks anything.
  const tokenHash = new URLSearchParams(window.location.search).get('token_hash')

  const [verifying, setVerifying] = useState(false)
  const [verified, setVerified] = useState(!tokenHash) // no token_hash means we already have a recovery session via the old event-based path
  const [verifyError, setVerifyError] = useState('')

  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  const confirmReset = async () => {
    setVerifying(true)
    setVerifyError('')
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'recovery' })
    setVerifying(false)
    if (error) setVerifyError('This link has expired or already been used. Request a new one from the login screen.')
    else setVerified(true)
  }

  const handleSubmit = async () => {
    setError('')
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    setSubmitting(true)
    const { error: updateError } = await supabase.auth.updateUser({ password })
    if (updateError) {
      setSubmitting(false)
      setError(updateError.message)
      return
    }

    // Forgot-password is often specifically "someone else has my password" --
    // sign out every other active session so a reset actually locks them out,
    // not just this device. Best-effort: the password change already
    // succeeded, so a failure here shouldn't block showing that success.
    await supabase.auth.signOut({ scope: 'others' }).catch(() => {})
    setSubmitting(false)
    setDone(true)
  }

  const inputStyle = {
    background: '#1a1a1a',
    border: '0.5px solid #252525',
    borderRadius: 8,
    padding: '11px 13px',
    fontSize: 14,
    color: '#ccc',
    outline: 'none',
    width: '100%',
    ...sans,
  }

  if (!verified) {
    return (
      <div style={{ minHeight: '100dvh', background: '#111', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 20px' }}>
        <div style={cardStyle}>
          <div style={{ ...serif, fontSize: 16, color: '#e8e4dc' }}>Reset your password</div>
          <div style={{ fontSize: 13, color: '#888', ...sans, lineHeight: 1.6 }}>Tap below to continue -- this confirms it's really you, not just an email scan.</div>
          {verifyError && <div style={{ fontSize: 12, color: '#ff6b6b', ...sans }}>{verifyError}</div>}
          <button onClick={confirmReset} disabled={verifying} style={{ ...buttonStyle, cursor: verifying ? 'default' : 'pointer', opacity: verifying ? 0.6 : 1 }}>
            {verifying ? 'Confirming...' : 'Continue'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100dvh', background: '#111', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 20px' }}>
      <div style={cardStyle}>
        <div style={{ ...serif, fontSize: 16, color: '#e8e4dc' }}>Set a new password</div>

        {done ? (
          <>
            <div style={{ fontSize: 13, color: '#888', ...sans, lineHeight: 1.6 }}>Your password has been updated.</div>
            <button onClick={onDone} style={buttonStyle}>
              Continue
            </button>
          </>
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 11, color: '#8f8f8f', ...sans }}>New password</label>
              <input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} style={inputStyle} />
            </div>
            {error && <div style={{ fontSize: 12, color: '#ff6b6b', ...sans }}>{error}</div>}
            <button onClick={handleSubmit} disabled={submitting} style={{ ...buttonStyle, cursor: submitting ? 'default' : 'pointer', opacity: submitting ? 0.6 : 1 }}>
              {submitting ? 'Please wait...' : 'Update password'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
