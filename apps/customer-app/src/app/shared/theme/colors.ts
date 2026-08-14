/**
 * Semantic color tokens for the customer app.
 *
 * Every component reads colors via `useTheme().colors.X` — never hardcodes
 * hex values. Adding a new token: add the key to `ColorTokens`, then to both
 * `lightColors` and `darkColors`. The two maps MUST keep identical keys.
 *
 * Three-tone palette, light theme:
 *   - Canvas: whisper blush (#FDF2F5) — a barely-there berry tint so
 *     the canvas picks up the brand hue without ever reading as dark.
 *     White cards, peach hero, and slate CTAs all sit cleanly on top.
 *   - Surfaces (cards, sheets, inputs, nav) lean white with a slate
 *     tint — glass-card fill uses dark-on-blush at low alpha so cards
 *     separate from the canvas without competing with it.
 *   - Ink: slate (#0F172A) at full / 72% / 55% / 42% — body copy stays
 *     legible at all sizes.
 *
 * Brand accent is slate-700 — drives every primary CTA, the active tab
 * bar pill, and inline brand links. Peach hero card stays on
 * `heroSurface` so the card reads as warm against the blush canvas.
 *
 * Semantic money tokens: `success` (positive money flow — credit issued
 * into the customer's wallet) and `successSurface` (rare tinted background
 * for success badges). Used by the recent-activity feed on the Home tab.
 */

export interface ColorTokens {
  /** Brand accent — primary CTAs, active states, hero card surface. */
  primary: string;
  /** Pressed/darker variant of the brand accent. */
  primaryActive: string;
  /**
   * Tinted primary — a lighter shade of the brand accent that pairs with
   * `primary` text. Used for soft CTAs (the coupon-style "Redeem" pill
   * on the Credits card) where the button needs the brand identity
   * without the heavy fill.
   */
  primarySurface: string;

  /** Background gradient start. */
  backgroundStart: string;
  /** Background gradient end. */
  backgroundEnd: string;
  /** Solid fallback background (used before gradient mounts / for loading). */
  backgroundSolid: string;

  /**
   * Hero balance card surface — peach (#DE6E4B), the brand's warm accent.
   * The hero card is the only place this token is used so the card stays
   * visually distinct from the slate primary that anchors every other
   * surface (CTAs, active tabs, links).
   */
  heroSurface: string;
  /**
   * Hero CTA text color — a darker peach that pairs with `heroSurface` so
   * the pill CTA label reads cleanly against the white pill.
   */
  heroSurfaceCta: string;

  /**
   * Active tab bar pill surface — the deep berry that carries the bottom
   * tab's active state. Lives next to `heroSurface` (also a brand
   * accent, also paired with white text via `textOnPrimary`) so the
   * brand-driven surfaces stay grouped in the token interface.
   */
  pillSurface: string;
  /**
   * Tinted berry surface — a pale, lighter shade of `pillSurface` that
   * pairs with `pillSurface`-coloured text. Used for soft CTAs (the
   * coupon-style "Redeem" pill on the Credits card) where the button
   * needs the brand identity without the heavy fill.
   */
  mainSurface: string;
  /**
   * Idle tab icon color — renders on top of `pillSurface` so it must be a
   * white tint that reads on the berry bar. Decoupled from `textMuted`
   * because that token is tuned for the canvas surface, not for icons on
   * the brand-colored tab bar.
   */
  tabIdleIcon: string;

  /** Glass card fill (semi-transparent). */
  surface: string;
  /** Recessed field fill (inputs sit slightly below the card). */
  surfaceInput: string;
  /** Glass hairline border. */
  surfaceBorder: string;
  /** Floating pill / active indicator fill. */
  surfacePill: string;
  /** Pill hairline. */
  surfacePillBorder: string;

  /** Primary text. */
  text: string;
  /** Subtitle / secondary copy. */
  textSecondary: string;
  /** Muted / inactive labels. */
  textMuted: string;
  /** Placeholder text in inputs. */
  textPlaceholder: string;
  /** Text rendered on top of the primary accent. */
  textOnPrimary: string;

  /** Inline error text. */
  error: string;
  /** Error surface fill — soft tinted background for error badges. */
  errorSurface: string;
  /** Warning accent (dev login, cautionary UI). */
  warning: string;
  /** Warning surface fill. */
  warningSurface: string;
  /** Warning border. */
  warningBorder: string;

  /**
   * "+ GHS xxx" green — money flowing IN to the customer's wallet. Used for
   * the `credit_issued` row in the recent-activity feed.
   */
  success: string;
  /** Background tint for success badges (rare use). */
  successSurface: string;

  /**
   * Bottom-sheet / modal surface. Always an elevated opaque surface (not
   * glass) so it reads as a distinct layer above the gradient.
   */
  sheet: string;
  /** Text on the sheet surface. */
  sheetText: string;
  /** Subdued text on the sheet surface (dial codes, secondary lines). */
  sheetTextMuted: string;
  /** Input field fill inside a sheet. */
  sheetInput: string;
  /** Separator hairline inside a sheet. */
  sheetSeparator: string;

  /** React Navigation chrome — card behind headers, tab bar fill. */
  navCard: string;
  navBorder: string;
}

export const lightColors: ColorTokens = {
  primary: "#89023E",
  primaryActive: "#5e012a",
  // Pale berry fill — a lighter shade of `primary` for soft CTAs.
  // Pairs with `primary` text so the button carries the brand identity
  // without the heavy fill.
  primarySurface: "#F5DDE3",

  // Hero balance card — the same deep pink that anchors every primary
  // CTA, the active tab pill, and the new fixed detail header. Single
  // brand color discipline: the card is a brand surface, not a parallel
  // accent.
  heroSurface: "#89023E",
  heroSurfaceCta: "#89023E",

  // Active tab bar pill — same deep pink as `primary` / `heroSurface`.
  // The pill's job is to draw the eye to the current tab; the warm
  // berry carries that more vividly than a neutral would.
  pillSurface: "#89023E",
  // Pale berry — a lighter shade of `pillSurface` for soft CTAs.
  // Pairs with `pillSurface` text so the button carries the brand
  // identity without the heavy fill.
  mainSurface: "#F5DDE3",
  // Idle tab icons sit on the berry bar — white at 50% keeps them
  // readable without competing with the white active pill.
  tabIdleIcon: "rgba(255,255,255,1)",

  // Whisper-blush canvas — a barely-there berry tint. The gradient
  // softens the blush slightly toward the bottom so it doesn't read as
  // a flat slab. Peach hero + slate CTAs both pop on top of this.
  backgroundStart: "#ffff",
  backgroundEnd: "#ffff",
  backgroundSolid: "#ffff",

  // Surfaces on the blush canvas — dark-on-blush low-alpha tints so
  // glass cards lift off the canvas without competing with it. Berry
  // hairlines at 10% keep the brand hue present in card edges without
  // making the borders visually heavy.
  surface: "#ffffff",
  surfaceInput: "rgba(15,23,42,0.04)",
  surfaceBorder: "rgba(137, 2, 62, 0.10)",
  surfacePill: "rgba(137, 2, 62, 0.06)",
  surfacePillBorder: "rgba(137, 2, 62, 0.12)",

  // Slate ink — body copy stays legible at all sizes.
  text: "#0f172a",
  textSecondary: "rgba(15,23,42,0.72)",
  textMuted: "rgba(15,23,42,0.55)",
  textPlaceholder: "rgba(15,23,42,0.42)",
  textOnPrimary: "#ffffff",

  error: "#dc2626",
  errorSurface: "rgba(220,38,38,0.10)",
  warning: "#b45309",
  warningSurface: "rgba(251,191,36,0.18)",
  warningBorder: "rgba(251,191,36,0.45)",

  success: "#059669",
  successSurface: "rgba(5,150,105,0.10)",

  // Sheets are crisp white — the strongest lift against the blush
  // canvas, reads as a clear elevated layer.
  sheet: "#ffffff",
  sheetText: "#0f172a",
  sheetTextMuted: "#64748b",
  sheetInput: "#f1f5f9",
  sheetSeparator: "#e2e8f0",

  navCard: "#ffffff",
  navBorder: "rgba(15,23,42,0.10)",
};

export const darkColors: ColorTokens = {
  primary: "#F472B6",
  primaryActive: "#EC4899",
  // Soft pink fill on dark — a low-alpha lifted berry so the soft CTA
  // reads against the slate-gradient backdrop without competing with
  // the pink text on `primary`.
  primarySurface: "rgba(178, 58, 106, 0.30)",

  // Dark hero card — the same lifted berry that anchors the active tab
  // pill. Single brand color on dark: #B23A6A reads cleanly against the
  // slate gradient backdrop without needing a parallel warm tone.
  heroSurface: "#B23A6A",
  heroSurfaceCta: "#B23A6A",

  // Dark active tab pill — the lifted berry that anchors the dark mode
  // brand surfaces.
  pillSurface: "#B23A6A",
  // Dark soft CTA surface — a low-alpha lifted berry that reads on the
  // slate gradient without competing with the brand text colour.
  mainSurface: "rgba(178, 58, 106, 0.30)",
  // Dark idle icons — white at 50% on the lifted berry bar.
  tabIdleIcon: "rgba(255,255,255,0.50)",

  // Canonical dark brand look — slate gradient backdrop + white text +
  // flat translucent surfaces (the canvas itself does the heavy lifting;
  // cards read against it).
  backgroundStart: "#334155",
  backgroundEnd: "#0f172a",
  backgroundSolid: "#0f172a",

  surface: "rgba(255,255,255,0.08)",
  surfaceInput: "rgba(255,255,255,0.06)",
  surfaceBorder: "rgba(255,255,255,0.14)",
  surfacePill: "rgba(178, 58, 106, 0.14)",
  surfacePillBorder: "rgba(178, 58, 106, 0.22)",

  text: "#ffffff",
  textSecondary: "rgba(255,255,255,0.70)",
  textMuted: "rgba(255,255,255,0.55)",
  textPlaceholder: "rgba(255,255,255,0.50)",
  textOnPrimary: "#ffffff",

  error: "#fecaca",
  errorSurface: "rgba(254,202,202,0.15)",
  warning: "#fcd34d",
  warningSurface: "rgba(251,191,36,0.15)",
  warningBorder: "rgba(251,191,36,0.40)",

  // Mint green — pops on the blue gradient while staying semantically
  // distinct from the brand blue.
  success: "#86efac",
  successSurface: "rgba(134,239,172,0.15)",

  // Deep midnight — pairs with the blue gradient (sits above it).
  sheet: "#0f172a",
  sheetText: "#f8fafc",
  sheetTextMuted: "#cbd5e1",
  sheetInput: "rgba(255,255,255,0.08)",
  sheetSeparator: "rgba(255,255,255,0.10)",

  navCard: "#0f172a",
  navBorder: "rgba(255,255,255,0.14)",
};
