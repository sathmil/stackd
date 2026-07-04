// One-off pre-import safety net (Phase 7) -- exports the current catalog
// tables so a bad import (wrong mapping, duplicate spam, garbage
// categorization) can be diffed or reverted by hand. There's no separate
// prod project yet (Phase 9) and no paid-tier point-in-time recovery
// (Phase 11), so this is the only safety net before a bulk write.
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: '.env.local' })

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const admin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function main() {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const dir = path.join(__dirname, 'backups', stamp)
  fs.mkdirSync(dir, { recursive: true })

  for (const table of ['brands', 'products', 'product_variants']) {
    const { data, error } = await admin.from(table).select('*')
    if (error) throw error
    fs.writeFileSync(path.join(dir, `${table}.json`), JSON.stringify(data, null, 2))
    console.log(`${table}: ${data.length} rows -> ${dir}/${table}.json`)
  }
}

main()
