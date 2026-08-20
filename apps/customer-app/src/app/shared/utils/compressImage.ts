import * as ImageManipulator from "expo-image-manipulator";
import { File } from "expo-file-system";

const MAX_DIMENSION = 1024;
const TARGET_BYTES = 1_000_000; // bucket upload ceiling
const QUALITY_STEPS = [0.8, 0.7, 0.6, 0.5, 0.4] as const;

// Compress to ≤1 MB for the avatar bucket PUT. Each quality step chains off the
// previous 1024px result, not the full source, so the multi-MB camera original
// is only decoded once. Avatar renders with contentFit="cover" so no square crop.
export async function compressImageToLocalFile(
  sourceUri: string,
): Promise<{ uri: string; contentType: string }> {
  let lastResult: ImageManipulator.ImageResult = await compressPass(
    sourceUri,
    QUALITY_STEPS[0],
  );

  for (let i = 1; i < QUALITY_STEPS.length; i++) {
    const size = await fileSizeBytes(lastResult.uri);
    if (size <= TARGET_BYTES) break;
    lastResult = await compressPass(lastResult.uri, QUALITY_STEPS[i]);
  }

  return { uri: lastResult.uri, contentType: "image/jpeg" };
}

async function compressPass(
  sourceUri: string,
  quality: number,
): Promise<ImageManipulator.ImageResult> {
  return ImageManipulator.manipulateAsync(
    sourceUri,
    // Only `width` is specified so aspect ratio is preserved.
    [{ resize: { width: MAX_DIMENSION } }],
    {
      compress: quality,
      format: ImageManipulator.SaveFormat.JPEG,
    },
  );
}

function fileSizeBytes(uri: string): number {
  // Sync getter; returns 0 if the file can't be read. Replaces deprecated getInfoAsync.
  return new File(uri).size;
}