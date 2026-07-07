// Downloads each sourced official-brand product photo, crops/pads it to a
// consistent square (matching compressImage's 800px convention used
// elsewhere for uploaded images), re-encodes as webp, and uploads it to the
// product-images bucket -- so photos sourced from many different brands'
// own sites at least display uniformly framed in the app, even though the
// underlying photography still varies brand to brand (see conversation).
//
// Input: scripts/data/new-catalog-template.csv (the hand-filled catalog)
//        scripts/data/photo-sources.json (brand|product_name|flavor -> source image URL,
//        populated from web research -- see scripts/data/photo-sources.example.json)
// Output: scripts/data/new-catalog-with-photos.csv (same rows, photo_url filled in
//         wherever a source was found and processed successfully)
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { parse } from 'csv-parse/sync'
import { stringify } from 'csv-stringify/sync'
import sharp from 'sharp'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: '.env.local' })

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUTPUT_SIZE = 800
const USER_AGENT = 'Stackd-VibeCoding-Project/1.0 (sathmi@stanford.edu)'

const admin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

function slugify(s) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function photoKey(row) {
  return `${row.brand}|${row.product_name}|${row.flavor}`
}

async function downloadImage(url) {
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`)
  return Buffer.from(await res.arrayBuffer())
}

async function processToSquareWebp(buffer) {
  return sharp(buffer)
    .resize(OUTPUT_SIZE, OUTPUT_SIZE, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .webp({ quality: 85 })
    .toBuffer()
}

async function main() {
  const csvPath = path.join(__dirname, 'data', 'new-catalog-template.csv')
  const sourcesPath = path.join(__dirname, 'data', 'photo-sources.json')

  const rows = parse(fs.readFileSync(csvPath, 'utf8'), { columns: true })
  const sources = JSON.parse(fs.readFileSync(sourcesPath, 'utf8'))

  let processed = 0
  let skipped = 0
  let failed = 0

  for (const row of rows) {
    if (row.photo_url && row.photo_url.trim()) continue // already has one, don't reprocess

    const key = photoKey(row)
    const sourceUrl = sources[key]
    if (!sourceUrl) {
      skipped++
      continue
    }

    try {
      const original = await downloadImage(sourceUrl)
      const processedBuffer = await processToSquareWebp(original)
      const filename = `${slugify(row.brand)}-${slugify(row.product_name)}-${slugify(row.flavor)}.webp`
      const storagePath = `catalog-import/${filename}`

      const { error: uploadError } = await admin.storage.from('product-images').upload(storagePath, processedBuffer, { contentType: 'image/webp', upsert: true })
      if (uploadError) throw uploadError

      const { data } = admin.storage.from('product-images').getPublicUrl(storagePath)
      row.photo_url = data.publicUrl
      processed++
      console.log(`OK: ${key}`)
    } catch (err) {
      failed++
      console.error(`FAILED: ${key} -- ${err.message}`)
    }
  }

  const outPath = path.join(__dirname, 'data', 'new-catalog-with-photos.csv')
  fs.writeFileSync(outPath, stringify(rows, { header: true }))
  console.log(`\nDone. Processed: ${processed}, skipped (no source): ${skipped}, failed: ${failed}`)
  console.log(`Output: ${outPath}`)
}

main()
