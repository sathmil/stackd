import { scoreStyle } from '../utils/scoreStyle'
import { colorHash } from '../utils/colorHash'

const serif = { fontFamily: 'Georgia, "Times New Roman", serif' }
const sans = { fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', fontWeight: 500 }

const AVATAR_STYLE = {
  coral: { background: '#2a1010', color: '#ff6b6b' },
  cyan: { background: '#0d2020', color: '#5ecfcf' },
  lav: { background: '#1a1525', color: '#a78bfa' },
  warm: { background: '#252010', color: '#e8c97a' },
}

/** @param {{ user: { id: string, username?: string, avatar_url?: string|null }, size?: 'sm'|'md'|'lg' }} props */
export function Avatar({ user, size = 'sm' }) {
  const px = { sm: 28, md: 36, lg: 48 }[size]
  const fs = { sm: 10, md: 12, lg: 15 }[size]

  if (user.avatar_url) {
    return <img src={user.avatar_url} alt="" style={{ width: px, height: px, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
  }

  const style = AVATAR_STYLE[colorHash(user.id || user.username || '?')]
  return (
    <div
      style={{
        width: px,
        height: px,
        borderRadius: '50%',
        background: style.background,
        color: style.color,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...serif,
        fontStyle: 'italic',
        fontSize: fs,
        fontWeight: 500,
        flexShrink: 0,
      }}
    >
      {(user.username || '?').charAt(0).toUpperCase()}
    </div>
  )
}

export function ScorePill({ score, extraStyle }) {
  const s = scoreStyle(score)
  return (
    <span
      style={{
        background: s.bg,
        color: s.color,
        border: `0.5px solid ${s.border}`,
        borderRadius: 20,
        fontSize: 13,
        fontWeight: 500,
        padding: '3px 10px',
        ...serif,
        letterSpacing: '-0.01em',
        flexShrink: 0,
        ...extraStyle,
      }}
    >
      {score.toFixed(1)}
    </span>
  )
}

export function BottomNav({ active, onNavigate }) {
  const items = [
    { key: 'feed', label: 'Feed', icon: '⌂' },
    { key: 'search', label: 'Search', icon: '⌕' },
    { key: 'scan', label: 'Scan', icon: '▣' },
    { key: 'lists', label: 'Lists', icon: '☰' },
    { key: 'profile', label: 'Profile', icon: '◯' },
  ]
  return (
    <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', padding: '10px 0 16px', borderTop: '0.5px solid #1e1e1e', background: '#111', flexShrink: 0 }}>
      {items.map((item) => (
        <button
          key={item.key}
          onClick={() => onNavigate(item.key)}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, background: 'none', border: 'none', cursor: 'pointer', padding: '0 10px' }}
        >
          <span style={{ fontSize: 20, color: active === item.key ? '#f0ece4' : '#828282', lineHeight: 1 }}>{item.icon}</span>
          <span style={{ fontSize: 10, ...sans, color: active === item.key ? '#f0ece4' : '#828282' }}>{item.label}</span>
        </button>
      ))}
    </div>
  )
}

export function Card({ children, style: extra = {}, onClick }) {
  const baseStyle = { background: '#181818', border: '0.5px solid #222', borderRadius: 12, padding: '12px', display: 'flex', flexDirection: 'column', gap: 8, ...extra }
  if (onClick) {
    return (
      <button onClick={onClick} style={{ ...baseStyle, textAlign: 'left', width: '100%', font: 'inherit', color: 'inherit' }}>
        {children}
      </button>
    )
  }
  return <div style={baseStyle}>{children}</div>
}

export function Divider() {
  return <div style={{ height: '0.5px', background: '#1e1e1e', flexShrink: 0 }} />
}

export function SectionLabel({ children }) {
  return <span style={{ fontSize: 10, color: '#828282', textTransform: 'uppercase', letterSpacing: '0.07em', ...sans }}>{children}</span>
}

export function Chip({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        borderRadius: 20,
        padding: '5px 13px',
        fontSize: 12,
        cursor: 'pointer',
        ...sans,
        whiteSpace: 'nowrap',
        border: active ? 'none' : '0.5px solid #252525',
        background: active ? '#f0ece4' : 'transparent',
        color: active ? '#111' : '#8f8f8f',
        fontWeight: active ? 500 : 400,
      }}
    >
      {label}
    </button>
  )
}

export function LoadingScreen() {
  return (
    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#111' }}>
      <div style={{ ...serif, fontStyle: 'italic', fontSize: 28, color: '#828282' }}>Stackd</div>
    </div>
  )
}

/**
 * Shared loading placeholder -- 'rows' (repeated card-shaped rows, for
 * Feed/Search/Lists-style pages) or 'detail' (a hero block + a few text
 * lines, for single-item pages like ProductPage/Profile). Deliberately one
 * shared component rather than a bespoke skeleton per page, so "loading"
 * always looks and feels the same across the app.
 */
export function Skeleton({ variant = 'rows', count = 5 }) {
  if (variant === 'detail') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 16 }}>
        <div style={{ display: 'flex', gap: 12 }}>
          <div className="skeleton-block" style={{ width: 54, height: 54, flexShrink: 0 }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, justifyContent: 'center' }}>
            <div className="skeleton-block" style={{ height: 16, width: '70%' }} />
            <div className="skeleton-block" style={{ height: 12, width: '40%' }} />
          </div>
        </div>
        <div className="skeleton-block" style={{ height: 80, width: '100%' }} />
        <div className="skeleton-block" style={{ height: 60, width: '100%' }} />
      </div>
    )
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 16 }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="skeleton-block" style={{ width: 36, height: 36, flexShrink: 0 }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div className="skeleton-block" style={{ height: 13, width: `${60 + ((i * 13) % 30)}%` }} />
            <div className="skeleton-block" style={{ height: 10, width: `${30 + ((i * 7) % 20)}%` }} />
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * Shared error state with an actual recovery path -- useAsync already
 * returns refetch(), but no page ever called it from the error branch, so
 * every load failure required a full page reload to recover from.
 */
export function ErrorState({ message = "Couldn't load this. Try again in a moment.", onRetry }) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      <div style={{ color: '#ff6b6b', fontSize: 15, ...sans }}>{message}</div>
      {onRetry && (
        <button onClick={onRetry} style={{ background: 'none', border: '0.5px solid #3a1a1a', borderRadius: 20, padding: '8px 18px', fontSize: 13, color: '#ff6b6b', cursor: 'pointer', ...sans }}>
          Try again
        </button>
      )}
    </div>
  )
}

export function NavBar({ title, onBack, rightEl }) {
  return (
    <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '0.5px solid #1e1e1e', flexShrink: 0 }}>
      {onBack ? (
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#8f8f8f', padding: 0, lineHeight: 1 }}>
          ←
        </button>
      ) : (
        <div style={{ width: 28 }} />
      )}
      <span style={{ ...{ fontFamily: 'Georgia, serif' }, fontSize: 16, color: '#e8e4dc' }}>{title}</span>
      {rightEl || <div style={{ width: 28 }} />}
    </div>
  )
}
