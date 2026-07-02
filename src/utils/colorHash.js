const PALETTE = ['coral', 'cyan', 'lav', 'warm']

/**
 * Deterministically picks one of the app's fixed avatar colors from any
 * string id -- same input always yields the same color, no state needed.
 * @param {string} id
 * @returns {string}
 */
export function colorHash(id) {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  }
  return PALETTE[hash % PALETTE.length]
}
