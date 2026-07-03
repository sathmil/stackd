/**
 * Color styling for a score on the app's real 1.0-5.0 rating scale.
 * @param {number} score
 */
export function scoreStyle(score) {
  if (score >= 4.5) return { bg: '#0d2020', border: '#1a3030', color: '#5ecfcf' }
  if (score >= 3.5) return { bg: '#1a1525', border: '#2a2040', color: '#a78bfa' }
  if (score >= 2.5) return { bg: '#2a1010', border: '#3a1a1a', color: '#ff6b6b' }
  return { bg: '#252010', border: '#352f1a', color: '#e8c97a' }
}
