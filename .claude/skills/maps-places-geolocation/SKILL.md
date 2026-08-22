---
name: maps-places-geolocation
description: Conventions for setting `latitude`, `longitude`, `place_id` on `branches` and `customers` via a free/open-source map picker. Covers the map UI (Leaflet on web, react-native-maps + OSM UrlTile on RN), Photon geocoding (forward + reverse, keyless), `navigator.geolocation` / `expo-location` permissions, and the `place_id` = OSM `osm_type:osm_id` format. Apply when adding/editing a branch or onboarding/editing a customer, or when wiring the future proximity-filter + Google-Maps-link feature.
---

# Maps, places & geolocation conventions

The `branches` and `customers` tables each carry `latitude (numeric, null)`, `longitude (numeric, null)`, `place_id (text, null)`. This feature sets those three fields from a map picker on two surfaces: the **webapp** (branch add/edit) and the **customer-app** (React Native / Expo — onboard + profile edit). The stack is **fully keyless and open-source** — no Google, no Mapbox, no API keys.

## Stack decision (do not deviate without raising it)

| Concern | Web (`main-webapp`) | RN (`apps/customer-app`) |
|---|---|---|
| Map render | **Leaflet** + `react-leaflet` + OSM raster tiles | **react-native-maps** (default provider: Apple Maps on iOS — keyless; Google Maps on Android — requires a free-tier Google Maps Android API key for the base render, the ONE keyed exception) |
| Forward geocode (search) | **Photon** `https://photon.komoot.io/api/?q=...&limit=10`, falling back to **Nominatim** `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=10` when Photon returns nothing | same (RN adds a `User-Agent` header to the Nominatim call — RN fetch sends no Referer) |
| Reverse geocode (lat/lng → label) | **Photon** `https://photon.komoot.io/reverse?lon=..&lat=..` | same |
| "Use my location" | `navigator.geolocation.getCurrentPosition` | `expo-location` (`requestForegroundPermissionsAsync` + `getCurrentPositionAsync`) |
| Identifier stored in `place_id` | OSM `osm_type:osm_id` (e.g. `"W:12345678"`) | same |

**Why keyless:** the user explicitly asked for free/open-source. Photon (Komoot, OSS, OSM data) and OSM tiles have no key and no billing. Nominatim is the documented fallback (single-shot only — 1 req/sec strict).

## `place_id` format — OSM `osm_type:osm_id`

OSM has no Google-style place_id. Photon/Nominatim responses carry `properties.osm_id` (number) + `properties.osm_type` (`"N"` = node, `"W"` = way, `"R"` = relation). Store the **composite string** `"{osm_type}:{osm_id}"` (e.g. `"N:123456"`, `"W:12345678"`, `"R:123456"`).

- This is stable and portable across OSM/Nominatim/Photon instances.
- Do **not** store Nominatim's own numeric `place_id` — it is instance-local and changes on DB reimport.
- If Google place_id is ever needed later, add a separate `google_place_id` column. **Never overload this `place_id` column** with a Google id — it would break the OSM contract and the future proximity/Maps-link feature.

## Photon API contract

**Forward (autocomplete):** `GET https://photon.komoot.io/api/?q={query}&limit=10`
- Optional `&lat={bias}&lon={bias}` to prefer nearby results (pass the user's current location or the existing marker position).
- Response: `{ features: [{ geometry: { coordinates: [lon, lat] }, properties: { osm_id, osm_type, name, city, country, ... } }] }`. Note: **coordinates are `[lon, lat]`** — swap when storing.
- Debounce the input by **350ms** and only fire when `query.trim().length >= 3`.
- **Fallback:** if Photon returns `[]`, call Nominatim `search?format=jsonv2&limit=10&addressdetails=1&q=...` (same OSM data, different matcher — surfaces informal/vernacular names Photon misses). Use the shared `searchPlaces()` helper in both `geocode.utils.ts` (web) and `geocode.ts` (RN) — it does this for you. Nominatim's `osm_type` is lowercase (`node`/`way`/`relation`); map to `N`/`W`/`R` so `place_id` matches Photon's format.

**Reverse:** `GET https://photon.komoot.io/reverse?lon={lon}&lat={lat}`
- Use after marker drag / click / "use my location" to get a display label + `osm_type`/`osm_id` for `place_id`.
- If reverse returns no feature (middle of ocean/field), still store lat/lng; set `place_id = null` and show "Dropped pin" as the label.

**Attribution (required, visible):** "© OpenStreetMap contributors" + "Geocoding by Komoot/Photon". Show on the map and near search results.

**Rate limits:** Photon is generous but not unlimited — the 350ms debounce + min-3-chars gate is enough. Never loop-call. Nominatim is capped at **1 req/sec** (single-shot fallback only, not bulk) and needs a valid `User-Agent` / `Referer` — web fetch sends a `Referer` automatically; RN sets `User-Agent: StoreCredit-CustomerApp/1.0`.

## Map picker UX (both platforms)

1. **Search box** (top of map) — typeahead, debounced 350ms, min 3 chars → Photon forward. Result list shows `name, city, country`; selecting one moves the marker there, reverse-geocodes for the label, and sets `place_id` from that feature's `osm_type:osm_id`.
2. **Map** — draggable marker + click/tap-to-place. On any marker move, reverse-geocode (debounced 500ms) for the label + `place_id`.
3. **"Use my location" button** — calls geolocation (see permission rules). On success, center map + reverse-geocode.
4. **Read-out line** — shows the resolved label (or "Dropped pin") + the lat/lng to be saved.
5. The form's hidden payload is `{ latitude, longitude, place_id }`. If the user never touches the map, all three stay `null` (location is optional).

## Geolocation permission rules

- **Never** request geolocation on component mount. Only on an explicit button tap (user gesture required, especially on iOS Safari).
- **Web:** `navigator.geolocation.getCurrentPosition(success, error, { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 })`. Wrap in try/catch — some browsers throw synchronously if permissions API is unavailable. On denial, show "Location denied — search or drag the map instead" and keep the picker fully usable without it. Geolocation requires **HTTPS** in production (localhost is exempt).
- **RN (Expo):** `Location.requestForegroundPermissionsAsync()` first; if `status !== "granted"`, fall back to manual search/drag — do not block. Then `Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })`. Configure permissions in `app.json`:
  - iOS: `infoPlist.NSLocationWhenInUseUsageDescription` = a real string explaining why.
  - Android: `plugins.expo-location` or `android.permissions` includes `ACCESS_COARSE_LOCATION`, `ACCESS_FINE_LOCATION`.
- Foreground location only. **No background tracking** — this feature captures a one-time pin, not movement.

## OSM tile usage policy (applies to both web and RN UrlTile)

- Use `https://tile.openstreetmap.org/{z}/{x}/{y}.png` (standard raster tiles) — **read and respect the OSM tile usage policy**: no bulk download, reasonable request rate, valid `User-Agent`/`Referer`. A map picker making on-demand tile requests for a single user view is well within policy.
- Attribution "© OpenStreetMap contributors" must be visible on the map (Leaflet's default attribution control + `urlTemplate` attribution on RN both satisfy this).

## Service / type wiring (backend)

- Add `latitude`, `longitude`, `place_id` to the `branches` + `customers` `alter table` blocks in `supabase/migrations/20260724000000_consolidated_schema.sql` (idempotent `add column if not exists`) — the DB already has them (types regenerated) but the migration must stay the source of truth.
- Add the three fields to `CreateBranchInput` / `UpdateBranchInput` in `apps/main-backend/src/app/types/branch.types.ts` and the equivalent customer input type (all optional/nullable — location is not required).
- Add them to the relevant `QueryFragments.BASE_BRANCH` / `BASE_CUSTOMER` constants so every select picks them up.
- Backend does **no** geocoding — it only persists the three fields the client sends. The map picker owns all geocoding; the backend is a thin store. (Keeps the free/OSS geocoding client-side, no server-side rate-limit exposure.)

## Future feature (proximity filter + Google Maps link) — do NOT build now, but design for it

- Proximity: a Postgres query ordering `branches` by haversine distance to the customer's lat/lng. No new columns needed.
- "Link to Google Maps": `https://www.google.com/maps/search/?api=1&query={lat},{lng}` — **keyless**. Do not introduce a Google dependency.
- Storing OSM `osm_type:osm_id` now does not block either of these.

## Anti-patterns

- No Google Places / Maps JS / Mapbox / OpenCage keys for **geocoding/search** — Photon (keyless) is the only geocoder. (Google Maps Android API key for the react-native-maps base render is the sole keyed exception, free-tier only.)
- No `navigator.geolocation` on mount, no background location, no "always track".
- No storing Nominatim's instance-local numeric `place_id` — use OSM `osm_type:osm_id`.
- No overloading `place_id` with a Google id later — add a separate column.
- No server-side geocoding calls in `main-backend` services — keep it client-side.
- No hardcoded colors on the customer-app map UI — source from `useThemeTokens()` per the [[customer-app-no-hardcoded-colors]] rule.