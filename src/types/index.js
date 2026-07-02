/**
 * JSDoc-only type definitions -- editor intellisense without a full
 * TypeScript migration (deferred, see DECISIONS.md). Mirrors supabase/schema.sql.
 */

/**
 * @typedef {Object} Product
 * @property {string} id
 * @property {string|null} brand_id
 * @property {string} brand_name
 * @property {string} name
 * @property {string} category
 * @property {string|null} description
 * @property {'pending'|'approved'|'flagged'|'rejected'} status
 * @property {string|null} created_by
 */

/**
 * @typedef {Object} ProductVariant
 * @property {string} id
 * @property {string} product_id
 * @property {string|null} flavor
 * @property {string|null} size
 * @property {string|null} upc
 * @property {string|null} image_url
 * @property {number|null} calories
 * @property {number|null} protein_g
 * @property {number|null} sugar_g
 * @property {number|null} caffeine_mg
 * @property {string|null} ingredients_text
 * @property {number|null} ai_ingredient_quality_score
 * @property {string|null} ai_ingredient_summary
 * @property {'pending'|'succeeded'|'failed'} ai_analysis_status
 * @property {'manual'|'external_api'} data_source
 * @property {'pending'|'approved'|'flagged'|'rejected'} status
 */

/**
 * @typedef {Object} Review
 * @property {string} id
 * @property {string} variant_id
 * @property {string} user_id
 * @property {number} taste_rating
 * @property {number} value_effectiveness_rating
 * @property {boolean|null} would_buy_again
 * @property {string|null} notes
 * @property {'visible'|'flagged'|'removed'} status
 */

/**
 * @typedef {Object} ListItem
 * @property {string} id
 * @property {string} list_id
 * @property {string} variant_id
 * @property {number} rank_position
 */

export {}
