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
