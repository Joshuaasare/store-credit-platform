// Each name/ID hashes to a fixed palette so the same merchant always renders
// the same colours. Shared by `OfferCard` and `ActivityRow`.

export const AVATAR_PALETTES: ReadonlyArray<readonly [string, string]> = [
  ["#e0e7ff", "#c7d2fe"],
  ["#fce7f3", "#fbcfe8"],
  ["#d1fae5", "#a7f3d0"],
  ["#fef3c7", "#fde68a"],
  ["#ede9fe", "#ddd6fe"],
  ["#cffafe", "#a5f3fc"],
];

// Falls back to sky if the hash lands outside the array (defensive — `hashString`
// is non-negative, but TS can't see that).
export function pickAvatarGradient(name: string): readonly [string, string] {
  const idx = hashString(name) % AVATAR_PALETTES.length;
  return AVATAR_PALETTES[idx] ?? (AVATAR_PALETTES[0] as readonly [string, string]);
}

// Hash on the stringified ID so callers don't have to wrap with `String()`.
export function pickAvatarGradientById(
  id: number | string | null | undefined,
): readonly [string, string] {
  if (id === null || id === undefined) {
    return pickAvatarGradient("");
  }
  const numeric = typeof id === "number" ? id : Number(id);
  const idx = Number.isFinite(numeric)
    ? Math.abs(Math.trunc(numeric)) % AVATAR_PALETTES.length
    : hashString(String(id)) % AVATAR_PALETTES.length;
  return AVATAR_PALETTES[idx] ?? (AVATAR_PALETTES[0] as readonly [string, string]);
}

// djb2-style hash; stable across reloads, fits in a 32-bit int.
export function hashString(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}