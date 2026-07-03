const UNITS = [
  ['year', 31536000],
  ['month', 2592000],
  ['week', 604800],
  ['day', 86400],
  ['hour', 3600],
  ['minute', 60],
]

/**
 * "2m ago" / "3h ago" / "5d ago" style relative time, falling back to "just now"
 * under a minute -- matches the compact style the feed/review cards already use.
 * @param {string} isoString
 */
export function timeAgo(isoString) {
  const seconds = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  for (const [unit, secondsInUnit] of UNITS) {
    const count = Math.floor(seconds / secondsInUnit)
    if (count >= 1) return `${count}${unit.charAt(0)} ago`
  }
  return 'just now'
}
