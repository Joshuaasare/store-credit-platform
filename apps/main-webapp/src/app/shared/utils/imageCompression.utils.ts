import imageCompression from "browser-image-compression";
import type { Options } from "browser-image-compression";

/**
 * Pure browser image-compression helpers. No Supabase keys, no network —
 * these just shrink a File before the storage service uploads it.
 */

export const defaultImageCompressionOptions: Options = {
  maxSizeMB: 0.2,
  maxWidthOrHeight: 800,
  useWebWorker: true,
  fileType: "image/jpeg",
  maxIteration: 20,
};

/** Compress an image File. Falls back to the original on failure. */
export async function compressImage(
  file: File,
  options: Options = defaultImageCompressionOptions,
): Promise<File> {
  try {
    return await imageCompression(file, options);
  } catch {
    return file;
  }
}
