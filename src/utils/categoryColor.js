/**
 * Fixed color per product category -- distinct hues so category labels read
 * as multicolor accents (matching the taste/value/effect rating colors)
 * rather than everything sharing one brand color.
 * @param {string} category
 */
export function categoryColor(category) {
  const map = {
    energy_drink: '#e8c97a',
    protein_bar: '#ff9f5a',
    protein_powder: '#a78bfa',
    protein_shake: '#8b7bfa',
    pre_workout: '#ff4d8d',
    greens_powder: '#4ade80',
    supplement: '#4d9fff',
    snack: '#5ecfcf',
    other: '#9a9a9a',
  }
  return map[category] || map.other
}
