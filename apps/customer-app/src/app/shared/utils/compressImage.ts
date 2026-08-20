import * as ImageManipulator from "expo-image-manipulator";
import { File } from "expo-file-system";

const MAX_DIMENSION = 1024;
const TARGET_BYTES = 1_000_000; // 1 MB — the bucket upload ceiling.
const QUALITY_STEPS = [0.8, 0.7, 0.6, 0.5, 0.4] as const;

/**
 * Compress a local image URI down to ≤1 MB so the PUT to the
 * `customers-avatar` bucket stays under the upload ceiling.
 *
 * Strategy:
 *   1. Resize the width down to 1024px (preserving aspect ratio — only
 *      `width` is passed to the resize action so non-square inputs
 *      aren't stretched). The avatar renders with `contentFit="cover"`,
 *      so the UI crops to square regardless. Most phone cameras shoot
 *      at 3000+ px on the long edge — a 1024px cap is more than enough
 *      for a 120px avatar.
 *   2. JPEG-encode at quality 0.8.
 *   3. If the result is still over 1 MB, iterate down through lower
 *      quality steps (0.7, 0.6, 0.5, 0.4) until it fits or we run out
 *      of steps. Each step chains off the previous 1024px result (NOT
 *      the full source) so the 3-5 MB camera original is only decoded
 *      once. The last step (0.4) on a 1024px image is almost always
 *      under 1 MB; if it somehow isn't, we return the smallest result
 *      and let the PUT attempt (the bucket will reject if it's truly
 *      too big — but the avatar ceiling is generous and 1024px @ q0.4
 *      is ~150 KB in practice).
 *
 * Returns the URI of the compressed image (a `file://` path in the
 * app's cache directory) + the inferred MIME type (always image/jpeg
 * after manipulation — `expo-image-manipulator` re-encodes).
 *
 * Note: this function does NOT read the result into memory — the
 * caller does that via `fetch(uri)` -> `blob()` when PUT-ing to the
 * signed Supabase URL.
 */
export async function compressImageToLocalFile(
  sourceUri: string,
): Promise<{ uri: string; contentType: string }> {
  // First pass — resize the long edge down to MAX_DIMENSION (preserving
  // aspect ratio) + initial quality. The avatar renders with
  // `contentFit="cover"` so the UI crops to square regardless — we don't
  // need to force a square resize here (which would stretch non-square
  // inputs on Android where the picker's aspect crop isn't enforced).
  let lastResult: ImageManipulator.ImageResult = await compressPass(
    sourceUri,
    QUALITY_STEPS[0],
  );

  // Iterate down if still over target. Each step chains off the previous
  // 1024px result (NOT the full source) so we don't re-decode the 3-5 MB
  // camera original on every quality step — the resize is a no-op on an
  // already-1024px image, so the pass just re-encodes at lower quality.
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
    // Only `width` is specified so aspect ratio is preserved. Passing
    // both width and height stretches non-square inputs to a square.
    [{ resize: { width: MAX_DIMENSION } }],
    {
      compress: quality,
      format: ImageManipulator.SaveFormat.JPEG,
    },
  );
}

function fileSizeBytes(uri: string): number {
  // `File.size` is a sync getter (returns 0 if the file doesn't exist
  // or can't be read) — replaces the deprecated `getInfoAsync`.
  return new File(uri).size;
}