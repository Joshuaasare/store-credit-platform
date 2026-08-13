/**
 * Semantic color tokens for the customer app.
 *
 * Every component reads colors via `useTheme().colors.X` — never hardcodes
 * hex values. Adding a new token: add the key to `ColorTokens`, then to both
 * `lightColors` and `darkColors`. The two maps MUST keep identical keys.
 *
 * Brand accent is maroon (#7f1d1d, red-800) — a warm, premium tone in
 * commerce / financial products (think banking, loyalty, premium goods).
 * The single brand voltage carries every primary CTA, the active state,
 * and inline brand links. Light theme is a pure-white canvas with slate
 * ink (#0f172a) text/icons (Airbnb-style) — maroon survives only as the
 * primary CTA accent. Dark theme is the canonical brand look: a maroon
 * gradient (#7f1d1d → #450a0a) with white text on flat white/glass
 * surfaces.
 *
 * Semantic money tokens: `success` (positive money flow — credit issued
 * into the customer's wallet) and `successSurface` (rare tinted background
 * for success badges). Used by the recent-activity feed on the Home tab.
 */

export interface ColorTokens {
  /** Brand accent — primary CTAs, active states. */
  primary: string;
  /** Pressed/darker variant of the brand accent. */
  primaryActive: string;

  /** Background gradient start. */
  backgroundStart: string;
  /** Background gradient end. */
  backgroundEnd: string;
  /** Solid fallback background (used before gradient mounts / for loading). */
  backgroundSolid: string;

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
  primary: "#7f1d1d",
  primaryActive: "#641111",

  // Pure-white canvas — flat design reads on solid white. Hero / marketing
  // surfaces carry their own subtle gradient strips when they need visual
  // energy.
  backgroundStart: "#ffffff",
  backgroundEnd: "#ffffff",
  backgroundSolid: "#ffffff",

  surface: "#ffffff",
  surfaceInput: "#f1f5f9",
  surfaceBorder: "rgba(15,23,42,0.10)",
  surfacePill: "rgba(15,23,42,0.06)",
  surfacePillBorder: "rgba(15,23,42,0.12)",

  // Slate ink — text and icons are deep slate (#0f172a) so body copy stays
  // legible at all sizes. Maroon survives only as the primary CTA accent,
  // like Airbnb's Rausch on a white canvas.
  text: "#0f172a",
  textSecondary: "rgba(15,23,42,0.72)",
  textMuted: "rgba(15,23,42,0.55)",
  textPlaceholder: "rgba(15,23,42,0.42)",
  textOnPrimary: "#ffffff",

  error: "#dc2626",
  warning: "#b45309",
  warningSurface: "rgba(251,191,36,0.18)",
  warningBorder: "rgba(251,191,36,0.45)",

  success: "#059669",
  successSurface: "rgba(5,150,105,0.10)",

  sheet: "#ffffff",
  sheetText: "#0f172a",
  sheetTextMuted: "#64748b",
  sheetInput: "#f1f5f9",
  sheetSeparator: "#e2e8f0",

  navCard: "#ffffff",
  navBorder: "rgba(15,23,42,0.10)",
};

export const darkColors: ColorTokens = {
  primary: "#f87171",
  primaryActive: "#dc2626",

  // Canonical dark brand look — maroon gradient backdrop + white text +
  // flat translucent surfaces (the canvas itself does the heavy lifting;
  // cards read against it).
  backgroundStart: "#7f1d1d",
  backgroundEnd: "#450a0a",
  backgroundSolid: "#450a0a",

  surface: "rgba(255,255,255,0.08)",
  surfaceInput: "rgba(255,255,255,0.06)",
  surfaceBorder: "rgba(255,255,255,0.14)",
  surfacePill: "rgba(255,255,255,0.10)",
  surfacePillBorder: "rgba(255,255,255,0.18)",

  text: "#ffffff",
  textSecondary: "rgba(255,255,255,0.70)",
  textMuted: "rgba(255,255,255,0.55)",
  textPlaceholder: "rgba(255,255,255,0.50)",
  textOnPrimary: "#ffffff",

  error: "#fecaca",
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

  navCard: "#0f1e4d",
  navBorder: "rgba(255,255,255,0.14)",
};