import { LayoutGrid, CupSoda, Dumbbell, Pill, Leaf, Salad } from 'lucide-react'

/**
 * Icon for each of Search's display-level category filters (CATEGORIES in
 * data/placeholder.js) -- grouping by icon instead of color, so a category
 * reads the same in dark or light theme without needing its own hue.
 */
export const FILTER_CATEGORY_ICONS = {
  All: LayoutGrid,
  Drinks: CupSoda,
  Protein: Dumbbell,
  Supps: Pill,
  Greens: Leaf,
  Food: Salad,
}

/**
 * Each filter gets its own accent (pulled from categoryColor.js's per-DB-
 * category palette) instead of every selected state sharing one color --
 * a single repeated purple across category/sort/score reads as flat, not
 * modern. "All" stays neutral since it doesn't represent one hue.
 */
export const FILTER_CATEGORY_COLORS = {
  All: 'var(--text-heading)',
  Drinks: '#e8c97a',
  Protein: '#a78bfa',
  Supps: '#4d9fff',
  Greens: '#4ade80',
  Food: '#5ecfcf',
}

/**
 * Icon for a raw DB category value (products.category), for the small
 * badge on each product row.
 * @param {string} dbCategory
 */
export function categoryIcon(dbCategory) {
  const map = {
    energy_drink: CupSoda,
    protein_shake: CupSoda,
    protein_powder: Dumbbell,
    protein_bar: Dumbbell,
    supplement: Pill,
    pre_workout: Pill,
    greens_powder: Leaf,
    snack: Salad,
    other: LayoutGrid,
  }
  return map[dbCategory] || LayoutGrid
}
