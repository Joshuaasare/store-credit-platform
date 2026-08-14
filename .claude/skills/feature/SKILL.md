## Prerequisites

- Before starting, check `.claude/plans/` for an existing plan file for this feature.
- If no plan exists, ask the user to run `/feature-request` to generate one.
- Always refer to the plan file during implementation.

## Implementation Steps

- start with putting together all the types you need for the feature
- Use the database schema in database.types.ts to understand the structure of the data, relationships, and constraints and how we'll be filtering the data from the frontend.
- Always modify backend types in the types folder. Never modify types in the schema folder directly.
- Create all the necessary types for the project in
- Run yarn:generate-types to generate the corresponding schema files and the fronted types. (NB in the backend you'll be using the types from the schema file and not the direct types)
- DO NOT modify the generated schema files directly. If you need to make changes to the types, always modify the backend types in the types folder and then run yarn:generate-types to update the schema files and frontend types accordingly.
- implement the API endpoints for the feature in the backend and services with pagination and search support.
- For the queries, specify the returned field in QueryFragment const and always use that in the queries to ensure type safety. Never fetch school_id to the frontend.
- Implement the frontend pages similar to how we've done it in the past. With the table showing the data.
- If its a new page, add the page and routes to the appropriate places.
- We always do soft deletion, using the deleted_at timestamp.
  -When fetching data and its relationships, always check that deleted_at for the main item and deleted_at for the relationships is always null.
- In the react-native apps, always use const for component functions. E.g when defining a component, use `const MyComponent = () => { ... }` instead of `function MyComponent() { ... }`.
- In the react-native apps (apps/customer-app), each React component lives in its OWN file. Components used by only one screen live under `apps/customer-app/src/app/screens/<screen>/components/<ComponentName>.tsx`. Components reused across screens live under `apps/customer-app/src/app/shared/components/<ComponentName>.tsx`. Pure utilities and hooks live under `apps/customer-app/src/app/shared/utils/` or `apps/customer-app/src/app/screens/<screen>/`. Reference: see the structure under `apps/customer-app/src/app/screens/home/` (Home) and `apps/customer-app/src/app/screens/credits/` (Credits).
- All React components in apps/customer-app are default exports (`export default function Foo(...)`). Utilities, hooks, and types are named exports (`export function`, `export type`). Importers: `import Foo from "..."` for components, `import { foo, type X } from "..."` for everything else.
- **Theme tokens only — never hardcode hex in components.** Every color in `apps/customer-app` MUST be read from `useThemeTokens()` (`theme.colors.*`, `theme.typography.*`, `theme.radii.*`). Never write a hex literal (`#1e40af`, `#fff`, etc.) inside a component, screen, navigation file, or stylesheet. The only file allowed to contain hex values is `apps/customer-app/src/app/theme/colors.ts`. If a surface genuinely needs a brand-derived background (e.g. a hero card whose fill IS the brand color), bind it inline via `style={{ backgroundColor: theme.colors.primary }}` — do not move it into the static `StyleSheet.create`. A rebrand (orange → blue → maroon, light/dark token swap) must be achievable by editing only `colors.ts`. Why: the theme is the single source of truth — any hardcoded hex breaks the visual contract and blocks light/dark parity. How to apply: before merging any UI change in `apps/customer-app`, `grep -rn "#[0-9a-fA-F]\{3,6\}\b" apps/customer-app/src/app/` and confirm every match is either inside `theme/colors.ts` or inside a clearly justified `LinearGradient` decorative overlay (white-on-card highlights) — never as a fill, border, text, or icon color.
- **Use `expo-image` for all remote images in the customer-app.** Never import `Image` from `react-native` for any component that renders a remote URL. Use `import { Image } from "expo-image"` instead. The stock `Image` re-fetches on every screen mount, which is the "images reload on every visit" bug that triggered this rule. Migrate `resizeMode="cover"` → `contentFit="cover"`, and add `transition={150}` for a soft fade-in. For merchant avatars, use the shared `MerchantAvatar` component (`apps/customer-app/src/app/shared/components/MerchantAvatar.tsx`) — it handles the layer-logo-or-initials fallback, the `expo-image` migration, and the layered placeholder. Why: persistent disk + memory cache across screen visits and app launches — the second visit renders from cache instead of re-fetching. How to apply: before merging any UI change in `apps/customer-app`, run `grep -rn 'from "react-native"' apps/customer-app/src/app/ | xargs grep -l "Image"` and confirm the result is empty. Any match means a stray `Image` import that needs to be migrated.

## Verification Steps

- After implementation, run `/test-affected` to verify no tests are broken.
- After implementation, run `/browser-check` to verify the UI loads correctly.
- Only declare success after both verification steps pass.
