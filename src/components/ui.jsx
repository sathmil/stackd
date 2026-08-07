import { Home, Search, ScanLine, Layers, CircleUserRound, Star, ArrowLeft } from 'lucide-react'
import { scoreStyle } from '../utils/scoreStyle'
import { colorHash } from '../utils/colorHash'
import { useTheme } from '../hooks/useTheme'

const serif = { fontFamily: 'var(--font-serif)' }
const sans = { fontFamily: 'var(--font-sans)', fontWeight: 500 }

const AVATAR_STYLE = {
  coral: { background: 'var(--avatar-coral-bg)', color: 'var(--avatar-coral-fg)' },
  cyan: { background: 'var(--avatar-cyan-bg)', color: 'var(--avatar-cyan-fg)' },
  lav: { background: 'var(--avatar-lav-bg)', color: 'var(--avatar-lav-fg)' },
  warm: { background: 'var(--avatar-warm-bg)', color: 'var(--avatar-warm-fg)' },
}

/** A ring gauge (conic-gradient, not SVG) showing value/max as a fraction of the circle, with the value centered inside. */
export function CircularProgress({ value, max = 10, color, size = 44 }) {
  const pct = Math.max(0, Math.min(1, value / max)) * 360
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: `conic-gradient(${color} ${pct}deg, var(--border-medium) 0deg)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <div
        style={{
          width: size - 9,
          height: size - 9,
          borderRadius: '50%',
          background: 'var(--bg-card)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: size * 0.27,
          fontWeight: 700,
          color,
          ...sans,
        }}
      >
        {value.toFixed(1)}
      </div>
    </div>
  )
}

/** "Dark"/"Light" label + a real sliding switch (not a pill button) that flips the app's theme, persisted across sessions. */
export function ThemeToggle() {
  const [theme, toggleTheme] = useTheme()
  const isDark = theme === 'dark'
  return (
    <button
      onClick={toggleTheme}
      role="switch"
      aria-checked={isDark}
      className="stackd-press"
      style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
    >
      <span style={{ fontSize: 13, color: 'var(--text-muted)', ...sans }}>{isDark ? 'Dark' : 'Light'}</span>
      <span
        style={{
          position: 'relative',
          width: 44,
          height: 25,
          borderRadius: 13,
          background: isDark ? 'var(--border-strong)' : 'var(--tier-gold-bg)',
          border: '0.5px solid var(--border-medium)',
          transition: 'background 0.2s ease',
          flexShrink: 0,
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: 2,
            left: isDark ? 21 : 2,
            width: 19,
            height: 19,
            borderRadius: '50%',
            background: 'var(--bg-nav)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 11,
            transition: 'left 0.2s ease',
            boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
          }}
        >
          {isDark ? '☾' : '☀'}
        </span>
      </span>
    </button>
  )
}

/** @param {{ user: { id: string, username?: string, avatar_url?: string|null }, size?: 'sm'|'md'|'lg'|'xl' }} props */
export function Avatar({ user, size = 'sm' }) {
  const px = { sm: 28, md: 36, lg: 48, xl: 112 }[size]
  const fs = { sm: 10, md: 12, lg: 15, xl: 36 }[size]

  if (user.avatar_url) {
    return <img src={user.avatar_url} alt="" style={{ width: px, height: px, borderRadius: '50%', objectFit: 'contain', background: 'var(--bg-subtle)', flexShrink: 0 }} />
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
        background: s.color,
        color: s.text,
        borderRadius: 20,
        fontSize: 13,
        fontWeight: 700,
        padding: '4px 10px',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 3,
        ...sans,
        letterSpacing: '-0.01em',
        flexShrink: 0,
        boxShadow: '0 2px 6px rgba(0,0,0,0.35)',
        ...extraStyle,
      }}
    >
      <Star size={11} fill="#FFC93C" strokeWidth={0} />
      {(score / 2).toFixed(1)}
    </span>
  )
}

export function BottomNav({ active, onNavigate }) {
  const items = [
    { key: 'feed', label: 'Feed', Icon: Home },
    { key: 'search', label: 'Search', Icon: Search },
    { key: 'scan', label: 'Scan', Icon: ScanLine },
    { key: 'lists', label: 'Lists', Icon: Layers },
    { key: 'profile', label: 'Profile', Icon: CircleUserRound },
  ]
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        padding: '10px 0 16px',
        borderTop: '0.5px solid var(--border-subtle)',
        background: 'var(--bg-nav)',
        flexShrink: 0,
      }}
    >
      {items.map(({ key, label, Icon }) => {
        const isActive = active === key
        return (
          <button
            key={key}
            onClick={() => onNavigate(key)}
            className="stackd-press"
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', padding: '0 10px' }}
          >
            <Icon size={22} strokeWidth={isActive ? 2.25 : 1.75} color={isActive ? 'var(--text-heading)' : 'var(--text-quiet)'} />
            <span style={{ fontSize: 10, ...sans, color: isActive ? 'var(--text-heading)' : 'var(--text-quiet)', fontWeight: isActive ? 600 : 500 }}>{label}</span>
          </button>
        )
      })}
    </div>
  )
}

export function Card({ children, style: extra = {}, onClick, className }) {
  const baseStyle = { background: 'var(--bg-card)', border: '0.5px solid var(--border)', borderRadius: 18, padding: '12px', display: 'flex', flexDirection: 'column', gap: 8, ...extra }
  if (onClick) {
    return (
      <button className={className} onClick={onClick} style={{ ...baseStyle, textAlign: 'left', width: '100%', font: 'inherit', color: 'inherit' }}>
        {children}
      </button>
    )
  }
  return (
    <div className={className} style={baseStyle}>
      {children}
    </div>
  )
}

export function Divider() {
  return <div style={{ height: '0.5px', background: 'var(--border-subtle)', flexShrink: 0 }} />
}

export function SectionLabel({ children }) {
  return <span style={{ fontSize: 10, color: 'var(--text-quiet)', textTransform: 'uppercase', letterSpacing: '0.07em', ...sans }}>{children}</span>
}

export function Chip({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className="stackd-press"
      style={{
        borderRadius: 20,
        padding: '7px 15px',
        fontSize: 13,
        cursor: 'pointer',
        ...sans,
        whiteSpace: 'nowrap',
        border: active ? 'none' : '0.5px solid var(--border-input)',
        background: active ? 'var(--text-heading)' : 'transparent',
        color: active ? 'var(--bg-nav)' : 'var(--text-muted)',
        fontWeight: active ? 600 : 400,
        boxShadow: active ? '0 2px 8px -2px rgba(0,0,0,0.3)' : 'none',
      }}
    >
      {label}
    </button>
  )
}

export function LoadingScreen() {
  return (
    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-nav)' }}>
      <div style={{ ...serif, fontStyle: 'italic', fontSize: 28, color: 'var(--text-quiet)' }}>Stackd</div>
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
      <div style={{ color: 'var(--tier-red)', fontSize: 15, ...sans }}>{message}</div>
      {onRetry && (
        <button
          onClick={onRetry}
          style={{ background: 'none', border: '0.5px solid var(--tier-red-border)', borderRadius: 20, padding: '8px 18px', fontSize: 13, color: 'var(--tier-red)', cursor: 'pointer', ...sans }}
        >
          Try again
        </button>
      )}
    </div>
  )
}

export function NavBar({ title, onBack, rightEl }) {
  return (
    <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, borderBottom: '0.5px solid var(--border-subtle)', flexShrink: 0 }}>
      {onBack ? (
        <button
          onClick={onBack}
          className="stackd-press"
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: 'var(--bg-subtle)',
            border: '0.5px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: 'var(--text-primary)',
            flexShrink: 0,
          }}
        >
          <ArrowLeft size={16} strokeWidth={2.25} />
        </button>
      ) : (
        <div style={{ width: 32 }} />
      )}
      <span
        style={{
          fontFamily: 'var(--font-serif)',
          fontWeight: 700,
          fontSize: 17,
          color: 'var(--text-heading)',
          letterSpacing: '-0.01em',
          flex: 1,
          textAlign: 'center',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {title}
      </span>
      {rightEl || <div style={{ width: 32 }} />}
    </div>
  )
}
