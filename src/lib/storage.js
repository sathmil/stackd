import { supabase } from './supabaseClient'

const MAX_DIMENSION = 800

/**
 * Downscales an image to fit within 800x800 and re-encodes it as WebP
 * client-side, before it ever reaches Storage -- keeps upload size and
 * egress costs down without needing a server-side image pipeline.
 * @param {File} file
 * @returns {Promise<Blob>}
 */
export async function compressImage(file) {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height))
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  canvas.getContext('2d').drawImage(bitmap, 0, 0, width, height)

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Image compression failed'))), 'image/webp', 0.85)
  })
}

/**
 * @param {Blob} blob
 * @param {string} bucket
 * @param {string} path
 * @returns {Promise<{ url: string | null, error: Error | null }>}
 */
export async function uploadImage(blob, bucket, path) {
  const { error } = await supabase.storage.from(bucket).upload(path, blob, { contentType: 'image/webp', upsert: false })
  if (error) return { url: null, error }
  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return { url: data.publicUrl, error: null }
}
