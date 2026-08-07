/**
 * Color styling for a score on the app's 1.0-10.0 rating scale.
 * @param {number} score
 */
export function scoreStyle() {
  // Every score renders the same purple tier now, matching the reference
  // design's single pill color -- `text` is the readable color for
  // text/icons sitting on top of the solid `color` fill (used by ScorePill).
  return { bg: 'var(--tier-purple-bg)', border: 'var(--tier-purple-border)', color: 'var(--tier-purple)', text: '#ffffff' }
}
