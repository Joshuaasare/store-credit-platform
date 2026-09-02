# Nearby Offers

The home screen's "Nearby Offers" section (and the browse-all screen) is fed by a ranked, location-aware offer feed. An **offer** is one active credit config (a discount promo or a cashback program), deduped across the branches that run it and represented by its nearest offering branch.

## Ranking rules

1. **Source** — every active branch within range of the customer's lat/lng is fetched with its active configs via the `branch_running_credit_config` / `branch_fixed_credit_config` junctions (same query as the Explore feed, so the fixed-config active-window check — perpetual `start_date == null && end_date == null`, `end_date` compared against UTC start-of-today — happens in JS).
2. **Dedupe** — one row per `(config_type, config_id)`; the representative branch is the **nearest** branch offering that config (rows are flattened in distance order, first occurrence wins).
3. **Distance first** — rows are ordered by representative-branch distance ascending (null distances last).
4. **One offer per merchant first pass** — walking the distance-sorted rows, each merchant's nearest offer is taken into the first pass; each merchant's remaining offers are appended after the first pass is exhausted (in the merchants' first-appearance order, each bucket already distance-ordered). The feed therefore opens with a spread of distinct merchants before any merchant repeats.
5. **Paginate after ranking** — `limit`/`offset` slice the fully ranked list; `total` is the pre-pagination count.

## Image fallback chain (offer card)

1. `config.images[0]` (campaign image)
2. Merchant `logo_url`
3. Gradient (name-hashed avatar palette) + large `pricetag` glyph in the themed primary at low opacity

## Endpoints

Both are customer-token only (`GET /customers/me/offers/...`).

- **`GET /nearby?lat&lng&limit&offset`** — ranked feed, returns `{ rows, total, offset, limit }`. Row shape:
  `{ config_type: "fixed" | "running", config: <config row incl. favorite_count, click_count, images>, merchant: { id, name, logo_url } | null, branch: <BaseBranch>, distance_km: number | null }`.
- **`GET /:configType/:configId/branches?lat&lng`** — all branches offering one deal, distance-sorted. Returns `{ config, branches }` where each branch is the full `BranchWithOffers` shape (what `BranchOffersDetail` consumes). 404 when the config does not exist (or is inactive/deleted).