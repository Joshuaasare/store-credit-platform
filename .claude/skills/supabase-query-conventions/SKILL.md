---
name: supabase-query-conventions
description: Conventions for writing Supabase queries in this repo — reuse QueryFragments, never use `any`/`as` (let database.types.ts infer), use dotted-column syntax for nested filters. Apply when writing or reviewing any `supabaseAdmin.from(...).select(...)` call.
---

# Supabase query conventions

This repo uses the Type-First Workflow: `apps/main-backend/src/app/types/*.types.ts` are the source of truth, and `yarn generate:types` regenerates `database.types.ts` (DB-side) and `api.types.ts` (frontend-side) from them. The generated `database.types.ts` is what gives every `supabaseAdmin.from(...)` call its inferred row type. Two rules keep that type-safety intact in service code.

## Rule 1 — Reuse `QueryFragments` for any `select(...)` with >3 columns

`apps/main-backend/src/app/constants/queryFragments.ts` defines canonical column sets per table (`BASE_STAFF`, `BASE_USER_PROFILE`, `BASE_BRANCH`, `BASE_USER_ROLE`, `BASE_CUSTOMER`, `BASE_CUSTOMER_TRANSACTION`, `BASE_USER`, `BASE_MERCHANT`, etc.). Use them everywhere instead of inlining column lists.

**Why:** Inline column lists duplicate the schema across every service. When a column is added/renamed, you chase down every inline string. QueryFragments centralizes the canonical set so a single change propagates everywhere.

**Apply:**

- `select(...)` with >3 columns → interpolate fragments via template strings, including inside embedded-resource parentheses.
- `select(...)` with ≤3 columns → a bare inline list is fine.
- Deliberately excluding sensitive fields (`otp`, `otp_expires_at`, `password_hash`, etc.) → write the explicit inline list. The whole point of that select is to omit columns the fragment would include.

**Example (canonical — `staff.service.ts` listStaff):**

```ts
let query = supabaseAdmin
  .from("staff")
  .select(
    `${QueryFragments.BASE_STAFF},
     branch:branches!inner(${QueryFragments.BASE_BRANCH}),
     user:users!inner(${QueryFragments.BASE_USER_PROFILE})`,
    { count: "exact" },
  )
  .eq("branch.merchant_id", merchantId)
  .is("deleted_at", null)
  .is("user.deleted_at", null)
  .is("branch.deleted_at", null)
  .not("role", "is", null);
```

**Anti-pattern (do not do this):**

```ts
.select(
  `id, user_id, branch_id, role, address, notes, created_at,
   branch:branches!inner(id, name, merchant_id),
   user:users!inner(id, phone, surname, other_names, access_granted,
                    last_login_at, created_at, deleted_at)`,
)
```

## Rule 2 — Never `any` / `as` type assertions; use dotted-column syntax for nested filters

`any` and `as` are never acceptable except in exceptional circumstances. The generated `database.types.ts` is the source of truth — let TS infer from it. If a filter call doesn't typecheck against the generated types, find the typed API that DOES work; don't cast.

**Why:** `any` defeats the type-safety the Type-First Workflow is built to provide. A `as any` is a silent contract break — when a column is renamed, the cast hides the broken reference instead of surfacing it as a compile error.

### Nested filters: dotted-column syntax, not `referencedTable` + `as any`

The generated types do not expose the `referencedTable` overload on `.eq()` / `.is()` / `.or()`, but they DO support the dotted-foreign-column syntax. Always use the dotted form.

**Apply:**

```ts
// ✅ Dotted syntax — infers natively, no cast
query = query.eq("roles.role", filters.role);
query = query.or(
  "user.surname.ilike.%x%,user.other_names.ilike.%x%,user.phone.ilike.%x%",
);
query = query.is("user.deleted_at", null);
query = query.is("roles.deleted_at", null);
```

```ts
// ❌ Don't — requires `as any` because the generated types lack the overload
query = (query as any)
  .eq("role", filters.role, { referencedTable: "staff_user_roles" })
  .is("deleted_at", null, { referencedTable: "staff_user_roles" });
```

The dotted form names the embedded resource (`roles`, `user`, `branch`) exactly as it appears in the `select(...)` string. The two are tied: change the embedded-resource alias in `select` and the dotted filter must change to match.

### Builder returns

Prefer letting the builder's inferred type flow through. If you need to name a complex join shape, declare a local type and annotate the result — a single annotation, not a chain of `as` casts:

```ts
// ✅ Single annotation
type StaffListRow = {
  id: number;
  user_id: string;
  branch_id: number;
  user: { id: string; phone: string; surname: string | null; ... };
  branch: { id: number; name: string | null } | null;
  roles: { role: StaffRole; deleted_at: string | null }[] | null;
};
const { data, error, count } = await query as unknown as {
  data: StaffListRow[] | null;
  error: { message: string } | null;
  count: number | null;
};
```

If the inferred type is already correct (the typical case with `select` returning known columns), `const { data, error, count } = await query` is enough — no annotation.

```ts
// ❌ Don't
const { data } = await (query as any) as { data: any[] | null; ... };
```

## When to run this skill

- Before writing any new `supabaseAdmin.from(...).select(...)` call.
- Before approving a PR that touches any service file under `apps/main-backend/src/app/services/`.
- When a `yarn generate:types` cycle finishes and a service that previously cast to `any` can now drop the cast — go back and clean it up.
