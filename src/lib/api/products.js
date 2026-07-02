import { supabase } from '../supabaseClient'

/** @returns {Promise<{ data: import('../../types').ProductVariant[] | null, error: Error | null }>} */
export async function fetchApprovedVariants() {
  return supabase.from('product_variants').select('*').eq('status', 'approved')
}
