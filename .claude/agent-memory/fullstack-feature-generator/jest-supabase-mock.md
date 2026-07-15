---
name: jest-supabase-mock
description: Pattern for mocking the supabaseAdmin client in backend service specs — chainable builder + wrapResult
metadata:
  type: project
---

Service specs in `apps/main-backend/src/app/services/*.spec.ts` need to mock `supabaseAdmin` from `../utils/supabase.client`. Pattern that works with SWC + jest hoisting:

```ts
jest.mock("../utils/supabase.client", () => ({
  supabaseAdmin: { from: jest.fn() },
}));
import { supabaseAdmin } from "../utils/supabase.client";
const supabaseFrom = supabaseAdmin.from as jest.Mock;
```

Do NOT reference outer-scope variables in the factory — Jest's "names starting with `mock`" exception is unreliable under SWC. Inline the mock object in the factory, then access methods via the imported module.

Build a chainable that wraps the resolver result so awaited destructuring (`const { data, error, count } = await ...`) matches real Supabase responses:

```ts
function wrapResult(r: any): any {
  if (r && typeof r === "object" && ("data" in r || "error" in r || "count" in r)) return r;
  return { data: r, error: null, count: null };
}
function chainable(resolver: () => any) {
  const obj: any = { select: jest.fn(()=>obj), eq: jest.fn(()=>obj), is: jest.fn(()=>obj), /* ... */ single: jest.fn(async ()=>wrapResult(resolver())), maybeSingle: jest.fn(async ()=>wrapResult(resolver())) };
  obj.then = (resolve: any) => Promise.resolve(wrapResult(resolver())).then(resolve);
  return obj;
}
```

Tests pass either bare data (wrapped as `{data:..., error:null}`), `{count: N}`, `{data:[...], error:null}` (passed through), or `{error:{message}}` (passed through).

**Why:** Without `wrapResult`, `const { data } = await ...` resolves to `undefined` and the test sees zeros/nulls instead of the fixture data. Caught this on the My Store spec pass.

**How to apply:** For route specs, mock the service module + auth middleware (`requireAuth` sets `request.user` from a global; `requireRoles` checks `request.user.roles`). Register the route plugin with `Fastify().register(routes)` and use `server.inject(...)`.