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
  /**
   * Frosted-white wash layered over a blur header to read whiter. Low alpha so
   * it tints rather than hides the blur; in dark mode it's near-transparent so
   * the dark frosted look is preserved.
   */
  glassWash: string;
  /** Recessed field fill (inputs sit slightly below the card). */
  surfaceInput: string;
  /** Glass hairline border. */
  surfaceBorder: string;
  /** Floating pill / active indicator fill. */
  surfacePill: string;
  /** Pill hairline. */
  surfacePillBorder: string;
  /**
   * Semi-transparent dark scrim — the overlay over an image while an
   * upload (or other in-flight action) is running. Dim the image, keep
   * the spinner legible. Not a full opaque so the photo is still
   * recognisable through it.
   */
  scrim: string;
  /**
   * Bottom-anchored darkening over a brand-logo image on a card (explore
   * BranchCard). Used as the bottom stop of a transparent → this gradient
   * so bright/colorful logos don't read loud against the card, and the
   * transition into the bottom glass footer is continuous (no hard line).
   * Subtle alpha — the logo stays visible, just grounded.
   */
  imageScrim: string;
  /**
   * Full-screen backdrop for the image viewer (lightbox). Opaque black in both
   * themes — photos read best on pure black regardless of the app theme, and
   * the viewer is a momentary full-screen layer, not a themed surface.
   */
  imageViewerBackdrop: string;
  /**
   * Translucent chrome (close-button background) inside the image viewer.
   * Black at low alpha so the close affordance reads over any photo without
   * competing with it.
   */
  imageViewerChrome: string;

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
  /**
   * Notification badge fill — sits on top of brand surfaces (page
   * header bell) so it must be a strong red that pops against both
   * the light berry and dark pink primaries. The badge text reads in
   * `onBadge` (always white) so the label is unambiguous in both
   * themes.
   */
  badge: string;
  /** Text rendered on top of the notification badge fill. */
  onBadge: string;
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
  primary: "#5C0435",
  primaryActive: "#5e012a",
  // Pale berry fill — a lighter shade of `primary` for soft CTAs.
  // Pairs with `primary` text so the button carries the brand identity
  // without the heavy fill.
  primarySurface: "#3E4B0E",

  // Hero balance card — the same deep pink that anchors every primary
  // CTA, the active tab pill, and the new fixed detail header. Single
  // brand color discipline: the card is a brand surface, not a parallel
  // accent.
  heroSurface: "#3D052A",
  heroSurfaceCta: "#89023E",

  // Active tab bar pill — same deep pink as `primary` / `heroSurface`.
  // The pill's job is to draw the eye to the current tab; the warm
  // berry carries that more vividly than a neutral would.
  pillSurface: "#5C0435",
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
  // Frosted-white wash over the home header blur — white at 32% tints the
  // frosted glass whiter without hiding the content scrolling underneath.
  glassWash: "rgba(255,255,255,0.32)",
  surfaceInput: "rgba(15,23,42,0.04)",
  surfaceBorder: "rgba(137, 2, 62, 0.15)",
  surfacePill: "rgba(137, 2, 62, 0.06)",
  surfacePillBorder: "rgba(137, 2, 62, 0.12)",
  // Slate ink at 45% — dims the photo enough for a white spinner to
  // pop while keeping the image recognisable underneath.
  scrim: "rgba(15,23,42,0.45)",
  imageScrim: "rgba(15,23,42,0.20)",
  imageViewerBackdrop: "#000000",
  imageViewerChrome: "rgba(0,0,0,0.5)",

  // Slate ink — body copy stays legible at all sizes.
  text: "#0f172a",
  textSecondary: "rgba(15,23,42,0.72)",
  textMuted: "rgba(15,23,42,0.55)",
  textPlaceholder: "rgba(15,23,42,0.42)",
  textOnPrimary: "#ffffff",

  error: "#dc2626",
  errorSurface: "rgba(220,38,38,0.10)",
  badge: "#dc2626",
  onBadge: "#ffffff",
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
  // Branded slate — slate-950 with a faint plum tint, only ~1.5 lightness
  // steps above the backdrop. The brand is felt rather than shown: CTAs,
  // hero, and tab bar read as elevated dark surfaces (by lightness, not
  // hue), with white text carrying the contrast. Near-monochrome dark
  // mode. Dark enough (#3D3142) that white text passes ~10:1, and as a
  // label/icon on the white hero + tab pills it reads at ~12.5:1.
  primary: "#3D3142",
  primaryActive: "#322A37",
  primarySurface: "rgba(61, 49, 66, 0.28)",

  heroSurface: "#3D3142",
  heroSurfaceCta: "#3D3142",

  pillSurface: "#3D3142",
  mainSurface: "rgba(61, 49, 66, 0.28)",
  // White at 55% on the dark-slate bar — base ~10:1, so idle icons stay
  // readable without competing with the white active-pill label.
  tabIdleIcon: "rgba(255,255,255,0.55)",

  // Slate-900 → slate-950 gradient — genuinely dark (the old slate-700
  // start read as a mid-gray). Near-black at the bottom keeps cards and
  // the tab bar clearly elevated without a harsh pure-black top.
  backgroundStart: "#0f172a",
  backgroundEnd: "#020617",
  backgroundSolid: "#020617",

  // Flat translucent white layers — modern dark surfaces are low-alpha
  // white over the backdrop, not solid fills. Borders stay subtle
  // (white 10%) so cards separate by shadow + hairline, not heavy edges.
  surface: "rgba(255,255,255,0.05)",
  glassWash: "rgba(255,255,255,0.03)",
  surfaceInput: "rgba(255,255,255,0.04)",
  surfaceBorder: "rgba(255,255,255,0.10)",
  surfacePill: "rgba(61, 49, 66, 0.16)",
  surfacePillBorder: "rgba(61, 49, 66, 0.28)",
  // Heavier than light mode so the spinner reads over the dark backdrop
  // as well as over a photo.
  scrim: "rgba(0,0,0,0.65)",
  imageScrim: "rgba(0,0,0,0.58)",
  imageViewerBackdrop: "#000000",
  imageViewerChrome: "rgba(0,0,0,0.5)",

  // Off-white primary text (pure white is harsh on slate-950). Muted
  // tiers drop in alpha rather than shifting hue.
  text: "#f5f5f6",
  textSecondary: "rgba(255,255,255,0.72)",
  textMuted: "rgba(255,255,255,0.52)",
  textPlaceholder: "rgba(255,255,255,0.40)",
  textOnPrimary: "#ffffff",

  // Solid semantic colors, not pastel — red-400 / amber-400 / emerald-400
  // read cleanly on slate-950 without looking washed out.
  error: "#f87171",
  errorSurface: "rgba(248,113,113,0.12)",
  badge: "#ef4444",
  onBadge: "#ffffff",
  warning: "#fbbf24",
  warningSurface: "rgba(251,191,36,0.14)",
  warningBorder: "rgba(251,191,36,0.36)",

  success: "#34d399",
  successSurface: "rgba(52,211,153,0.14)",

  // Slate-800 sheet — a clear elevated layer above the slate-950 backdrop,
  // paired with low-alpha white separators.
  sheet: "#1e293b",
  sheetText: "#f5f5f6",
  sheetTextMuted: "rgba(255,255,255,0.55)",
  sheetInput: "rgba(255,255,255,0.06)",
  sheetSeparator: "rgba(255,255,255,0.08)",

  // Slate-900 tab bar — subtle lift above the gradient bottom.
  navCard: "#0f172a",
  navBorder: "rgba(255,255,255,0.10)",
};
