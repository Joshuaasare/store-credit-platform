# Directory Structure

Canonical file and directory structure for apps in this monorepo. The customer-app is the reference implementation; the webapp uses a related but inconsistent convention noted at the bottom.

## Customer-app canonical structure

```
apps/customer-app/src/app/
├── api/                  # React Query client + HTTP client setup
├── components/           # (REMOVED in refactor — do not recreate)
├── navigation/           # React Navigation navigators (stack/tab)
├── screens/              # One folder per route
│   ├── home/
│   │   ├── HomeScreen.tsx
│   │   ├── components/   # Screen-specific components
│   │   │   ├── ActivitiesModal.tsx
│   │   │   ├── Header.tsx
│   │   │   ├── HeroBalanceCard.tsx
│   │   │   ├── ListHeader.tsx
│   │   │   ├── NearbyOffersSection.tsx
│   │   │   ├── OfferCard.tsx
│   │   │   └── RecentActivitySection.tsx
│   │   ├── deriveOffers.ts       # Screen-specific derivation helper
│   │   └── useActivitiesFeed.ts  # Screen-specific React Query hook
│   └── credits/
│       ├── CreditsScreen.tsx
│       └── components/
│           ├── CreditCard.tsx
│           ├── EmptyState.tsx
│           ├── ErrorState.tsx
│           └── LoadingState.tsx
├── shared/
│   ├── components/       # Reusable UI primitives
│   │   ├── ActivityRow.tsx
│   │   ├── GlassCard.tsx
│   │   ├── GlassInput.tsx
│   │   ├── GlassSegmentedControl.tsx
│   │   ├── GlassTransition.tsx
│   │   ├── PhoneInput.tsx
│   │   ├── PrimaryButton.tsx
│   │   └── ScreenBackground.tsx
│   └── utils/            # Pure helpers
│       ├── computeInitials.ts
│       └── formatGhs.ts
├── store/                # Zustand stores
├── theme/                # Color, spacing, typography tokens
├── App.tsx               # Root component
├── api/                  # API/HTTP client
└── ...
```

### What each level means

- `screens/<screen>/` — one folder per route. Contains the screen file (`<Screen>Screen.tsx`), its sub-components, screen-specific hooks, and screen-specific derivation helpers.
- `screens/<screen>/components/` — React components used by exactly that screen. Default exports.
- `screens/<screen>/<name>.ts` — screen-specific React Query hooks or pure derivation helpers. Sibling to the screen file, not nested in `components/`. Named exports.
- `shared/components/` — reusable UI primitives (themed buttons, glass cards, gradient backgrounds) and components used by 2+ screens. Default exports.
- `shared/utils/` — pure utilities (formatting, string helpers). No JSX. Named exports.
- `theme/` — design tokens (colors, spacing, typography).
- `api/` — React Query client + HTTP client setup.
- `navigation/` — React Navigation navigators.
- `store/` — Zustand stores.
- `components/` at the top level of `app/` — **does not exist** and must not be recreated. The old monolith-folder pattern was removed in a refactor.

## Webapp convention (cross-reference)

`apps/main-webapp/src/app/pages/<page>/components/` is the parallel pattern for screen-specific components on the web. Examples: `MyStore/components/`, `Customers/components/`.

The webapp is **inconsistent** — some pages have a `components/` subfolder, others inline their components in the page file. The customer-app's structure (one component per file under `screens/<screen>/components/` or `shared/components/`) is the new canonical form.

**Do not refactor the webapp in this skill** — only the customer-app refactor is in scope. When adding new pages to the webapp, mirror the customer-app structure (`pages/<page>/components/`).

## Decision tree

Use this 4-question check whenever you are about to add a new file:

1. **Is the file a pure utility (no JSX, returns a primitive/string/number)?** → `shared/utils/`.
2. **Is it used by more than one screen, OR is it a generic UI primitive (themed button, glass card, gradient background)?** → `shared/components/`.
3. **Is it used by exactly one screen and tightly coupled to that screen's data?** → `screens/<screen>/components/`.
4. **Is it a screen-specific React Query hook or data-derivation helper?** → `screens/<screen>/` (sibling to the screen file).

Same logic applies to the webapp, with `pages/` instead of `screens/`.

## Common mistakes

- **Multiple components in one file.** "We'll just keep this small one inline" — no. Every component gets its own file. If the screen file has 3+ sub-components, extract them to `screens/<screen>/components/`.
- **Promoting to `shared/components/` too early.** "Just in case another screen needs it later" — only lift a component to `shared/components/` when a second screen actually needs it. YAGNI: premature sharing creates a false API surface.
- **Putting a generic primitive in `screens/<screen>/components/`.** `GlassCard`, `PrimaryButton`, `ScreenBackground` belong in `shared/components/` even if only one screen currently uses them — they are themed/reusable by design, and other screens will adopt them.
- **Hardcoding hex colors in components.** The theme is the single source of truth. Every color, typography, and radius value MUST come from `useThemeTokens()` (`theme.colors.*`, `theme.typography.*`, `theme.radii.*`). The only file in `apps/customer-app/src/app/` allowed to contain hex literals is `apps/customer-app/src/app/theme/colors.ts`. If you need a brand-derived surface (e.g. the hero "credit card" whose fill IS the brand color), bind it inline via `style={{ backgroundColor: theme.colors.primary }}` — do not move it into the static `StyleSheet.create`. Decorative white-on-card tints inside a `LinearGradient` overlay are acceptable (they describe layering, not brand). Before merging any UI change, `grep -rn "#[0-9a-fA-F]\{3,6\}\b" apps/customer-app/src/app/` and confirm every match is inside `theme/colors.ts` or inside a justified white-overlay gradient — never as a fill, border, text, or icon color. A rebrand (orange → blue → maroon) must be achievable by editing only `colors.ts`.
- **Importing `Image` from `react-native` for remote URLs.** The customer-app uses `expo-image` for every remote image so the disk + memory cache survives across screen visits and app launches. Import `Image` from `expo-image` (`import { Image } from "expo-image"`), swap `resizeMode="cover"` → `contentFit="cover"`, and add `transition={150}` for a soft fade-in. Never `import { Image } from "react-native"` for a component that renders a `source={{ uri }}`. For merchant avatars, use the shared `MerchantAvatar` component (`apps/customer-app/src/app/shared/components/MerchantAvatar.tsx`) instead of writing a new avatar from scratch. Before merging any UI change, run `grep -rn 'from "react-native"' apps/customer-app/src/app/ | xargs grep -l "Image"` and confirm the result is empty — any match means a stray `Image` import that needs to be migrated.

## Examples

**7 home sub-components:** `Header`, `HeroBalanceCard`, `ListHeader`, `NearbyOffersSection`, `OfferCard`, `RecentActivitySection`, `ActivitiesModal`.

**4 credits sub-components:** `CreditCard`, `EmptyState`, `ErrorState`, `LoadingState`.

**8 shared components:** `ActivityRow`, `GlassCard`, `GlassInput`, `GlassSegmentedControl`, `GlassTransition`, `PhoneInput`, `PrimaryButton`, `ScreenBackground`.

**2 shared utils:** `computeInitials`, `formatGhs`.
