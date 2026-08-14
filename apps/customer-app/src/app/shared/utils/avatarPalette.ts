/**
 * Avatar gradient palette for merchant avatars. Two pastel stops per palette
 * — used as a placeholder background when the merchant has no `logo_url`,
 * or as an underlay behind the initials watermark. Stable and tasteful
 * across merchants: each name hashes to a fixed palette so the same
 * merchant always gets the same colours.
 *
 * Lives in `shared/utils` so `OfferCard` and `ActivityRow` both render the
 * same visual language for merchant avatars.
 */

export const AVATAR_PALETTES: ReadonlyArray<readonly [string, string]> = [
  ["#e0e7ff", "#c7d2fe"], // sky
  ["#fce7f3", "#fbcfe8"], // rose
  ["#d1fae5", "#a7f3d0"], // emerald
  ["#fef3c7", "#fde68a"], // amber
  ["#ede9fe", "#ddd6fe"], // violet
  ["#cffafe", "#a5f3fc"], // cyan
];

/**
 * Pick a stable two-color pastel gradient for a given merchant name. Falls
 * back to the sky palette if the hash lands outside the array (defensive
 * — `hashString` is non-negative, but TypeScript can't see that).
 */
export function pickAvatarGradient(name: string): readonly [string, string] {
  const idx = hashString(name) % AVATAR_PALETTES.length;
  return AVATAR_PALETTES[idx] ?? (AVATAR_PALETTES[0] as readonly [string, string]);
}

/** Tiny djb2-style hash — stable across reloads, fits in a 32-bit int. */
export function hashString(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}