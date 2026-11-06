import imageCompression from 'browser-image-compression'
// Served from our own bundle: the library's web worker otherwise `importScripts` it from jsDelivr.
import imageCompressionLibUrl from 'browser-image-compression/dist/browser-image-compression.js?url'

const MAX_SIZE_MB = 0.4

/**
 * Downscales and re-encodes an image to at most `maxWidthOrHeight` px and ~400 KB.
 * Always resolves to a `File` that keeps the original file name.
 */
export async function compressImage(file: File, maxWidthOrHeight: number = 1280): Promise<File> {
  // Typed as `File`, but falls back to a Blob-based object where the `File` constructor is unavailable.
  const compressed: Blob = await imageCompression(file, {
    maxSizeMB: MAX_SIZE_MB,
    maxWidthOrHeight,
    useWebWorker: true,
    libURL: imageCompressionLibUrl,
  })

  return compressed instanceof File
    ? compressed
    : new File([compressed], file.name, { type: compressed.type, lastModified: Date.now() })
}
