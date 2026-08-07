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
 * @param {{ upsert?: boolean }} [options] -- upsert for a fixed path that gets replaced (e.g. an avatar), not accumulated
 * @returns {Promise<{ url: string | null, error: Error | null }>}
 */
export async function uploadImage(blob, bucket, path, { upsert = false } = {}) {
  const { error } = await supabase.storage.from(bucket).upload(path, blob, { contentType: 'image/webp', upsert })
  if (error) return { url: null, error }
  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return { url: data.publicUrl, error: null }
}

const AVATAR_OUTPUT_SIZE = 400

/**
 * Draws the user-chosen crop rectangle (in the original image's natural
 * pixel coordinates, as produced by react-easy-crop's onCropComplete) onto a
 * fixed-size square canvas and re-encodes it as WebP -- this is the final
 * upload-ready blob, no separate compressImage pass needed since the canvas
 * is already downscaled to `outputWidth`x`outputHeight` (both default to the
 * avatar size/aspect; product and list-cover photos pass their own, since
 * they aren't cropped to a small square).
 * @param {string} imageSrc -- object URL for the source file
 * @param {{ x: number, y: number, width: number, height: number }} cropPixels
 * @param {number} [outputWidth]
 * @param {number} [outputHeight]
 * @returns {Promise<Blob>}
 */
export async function cropImageToBlob(imageSrc, cropPixels, outputWidth = AVATAR_OUTPUT_SIZE, outputHeight = outputWidth) {
  const image = await new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = imageSrc
  })

  const canvas = document.createElement('canvas')
  canvas.width = outputWidth
  canvas.height = outputHeight
  canvas.getContext('2d').drawImage(image, cropPixels.x, cropPixels.y, cropPixels.width, cropPixels.height, 0, 0, outputWidth, outputHeight)

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Image crop failed'))), 'image/webp', 0.85)
  })
}
