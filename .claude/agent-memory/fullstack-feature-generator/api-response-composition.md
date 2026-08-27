---
name: api-response-composition
description: Endpoint response shapes should compose existing Base* types (e.g. branch: BaseBranch; merchant: BaseMerchant) rather than flatten unrelated fields to top-level props; adding a column to a referenced table should not ripple to this endpoint's types.
metadata:
  type: feedback
---

When a new endpoint returns a related row (branch + merchant, customer + user, etc.), nest the existing `Base*` types in the response shape instead of re-declaring individual fields at the top level.

```ts
// ✅ Composed — adding `merchants.cover_photo_url` auto-flows
export interface ExploreBranch {
  branch: BaseBranch;
  merchant: BaseMerchant;
  offers_summary: ExploreBranchOffersSummary;
  distance_km: number | null;
}

// ❌ Flat — freezes the column set, drifts from schema
export interface ExploreBranchCard {
  branch_id: number;
  branch_name: string | null;
  city: string;
  distance_km: number | null;
  offer_count: number;
  image_url: string | null;
  merchant_name: string;
  merchant_slug: string | null;
  merchant_logo_url: string | null;  // breaks the moment merchants adds another column
}
```

**Why:** a flat type copies fields by hand, freezing the column set at write time. Every new column on the referenced table requires chasing down every flat type that hand-copied fields. Composed types flow changes through automatically via the `QueryFragments.*` constant and the inferred row type. See [[return-nested-join-shape]] for the full convention and the original "don't flatten into a custom response type" rule.

**How to apply:** when designing a new endpoint that returns a related row, write the response type as `{ rowEntity: BaseEntity; relatedEntity: BaseOtherEntity; …computed}` — never `{ rowEntity_id, rowEntity_name, relatedEntity_name, relatedEntity_slug, …}`. Reference: `CustomerExploreBranchesResponse` in `branch.schema.ts`.
