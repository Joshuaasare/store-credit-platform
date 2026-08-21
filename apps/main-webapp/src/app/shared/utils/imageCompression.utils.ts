import imageCompression from "browser-image-compression";
import type { Options } from "browser-image-compression";

export const defaultImageCompressionOptions: Options = {
  maxSizeMB: 0.2,
  maxWidthOrHeight: 800,
  useWebWorker: true,
  fileType: "image/jpeg",
  maxIteration: 20,
};

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

// Promo banners are wider than logos, so allow up to 1600px and cap at 500KB.
// compressImage swallows lib errors and returns the original — enforce the cap
// here and throw so the caller can toast a clear message.
const PROMO_MAX_BYTES = 500 * 1024;

export const promoImageCompressionOptions: Options = {
  maxSizeMB: 0.49,
  maxWidthOrHeight: 1600,
  useWebWorker: true,
  fileType: "image/jpeg",
  maxIteration: 25,
};

// iPhone HEIC photos can't be decoded by Chrome/Firefox/Edge canvas, so convert
// to JPEG first via heic2any (WASM, ~1MB) — lazy-loaded so it only ships when a
// HEIC file is actually picked. After conversion the stored object is JPEG, so
// the bucket MIME allowlist doesn't need image/heic.
export function isHeic(file: File): boolean {
  const t = file.type.toLowerCase();
  if (t === "image/heic" || t === "image/heif") return true;
  return /\.(heic|heif)$/i.test(file.name);
}

async function convertHeicToJpeg(file: File): Promise<File> {
  const { default: heic2any } = await import("heic2any");
  const blob = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.92 });
  const out = Array.isArray(blob) ? blob[0] : blob;
  return new File(
    [out],
    file.name.replace(/\.(heic|heif)$/i, ".jpg"),
    { type: "image/jpeg" },
  );
}

export async function compressPromoImage(file: File): Promise<File> {
  const input = isHeic(file) ? await convertHeicToJpeg(file) : file;
  const compressed = await compressImage(input, promoImageCompressionOptions);
  if (compressed.size > PROMO_MAX_BYTES) {
    throw new Error(`${file.name} could not be compressed below 500KB`);
  }
  return compressed;
}
