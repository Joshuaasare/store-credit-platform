import { merchantService } from "./merchant.service";
import { supabaseAdmin } from "../utils/supabase.client";

jest.mock("../utils/supabase.client", () => ({
  supabaseAdmin: {
    from: jest.fn(),
  },
}));

const supabaseFrom = supabaseAdmin.from as jest.Mock;

// Chainable Supabase mock builder
function wrapResult(r: any): any {
  if (r && typeof r === "object" && ("data" in r || "error" in r || "count" in r)) {
    return r;
  }
  return { data: r, error: null, count: null };
}

function chainable(resolver: () => any): any {
  const obj: any = {
    select: jest.fn(() => obj),
    insert: jest.fn(() => obj),
    update: jest.fn(() => obj),
    delete: jest.fn(() => obj),
    eq: jest.fn(() => obj),
    neq: jest.fn(() => obj),
    is: jest.fn(() => obj),
    not: jest.fn(() => obj),
    gte: jest.fn(() => obj),
    lte: jest.fn(() => obj),
    order: jest.fn(() => obj),
    limit: jest.fn(() => obj),
    single: jest.fn(async () => wrapResult(resolver())),
    maybeSingle: jest.fn(async () => wrapResult(resolver())),
  };
  obj.then = (resolve: any) => Promise.resolve(wrapResult(resolver())).then(resolve);
  return obj;
}

function setFromResult(result: any) {
  supabaseFrom.mockImplementation(() => chainable(() => result));
}

describe("MerchantService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getMerchantIdForUser", () => {
    it("returns null when the user has no staff row", async () => {
      setFromResult(null);
      const out = await merchantService.getMerchantIdForUser("user-1");
      expect(out).toBeNull();
    });

    it("resolves merchant_id and branch_id from staff → branches → merchants", async () => {
      setFromResult({
        id: 1,
        branch_id: 7,
        user_id: "user-1",
        branches: { id: 7, merchant_id: 42, merchants: { id: 42 } },
      });
      const out = await merchantService.getMerchantIdForUser("user-1");
      expect(out).toEqual({ merchant_id: 42, branch_id: 7 });
    });

    it("returns null when the joined branch/merchant is missing", async () => {
      setFromResult({ id: 1, branch_id: 7, user_id: "user-1", branches: null });
      const out = await merchantService.getMerchantIdForUser("user-1");
      expect(out).toBeNull();
    });
  });

  describe("getMyMerchantWithStats", () => {
    it("returns null when merchant row is missing", async () => {
      setFromResult(null);
      const out = await merchantService.getMyMerchantWithStats(99);
      expect(out).toBeNull();
    });

    it("aggregates stats + pool from multiple queries", async () => {
      const results = [
        {
          id: 42,
          name: "Acme",
          phone: "+233500000000",
          country_code: "GH",
          slug: "acme",
          is_active: true,
          created_at: "2025-01-01T00:00:00Z",
          credit_pool_used: 1500,
          credit_pool_limit: 5000,
        },
        { count: 3 },
        { count: 5 },
        { count: 12 },
        [{ credit_generated: 100 }, { credit_generated: 250.5 }],
      ];
      let i = 0;
      supabaseFrom.mockImplementation(() => chainable(() => results[i++]));

      const out = await merchantService.getMyMerchantWithStats(42);
      expect(out).not.toBeNull();
      expect(out!.id).toBe(42);
      expect(out!.branch_count).toBe(3);
      expect(out!.staff_count).toBe(5);
      expect(out!.customer_count).toBe(12);
      expect(out!.lifetime_credit_issued).toBeCloseTo(350.5);
      expect(out!.credit_pool_used).toBe(1500);
      expect(out!.credit_pool_limit).toBe(5000);
    });

    it("treats null credit_pool_limit as null (no cap set)", async () => {
      const results: any[] = [
        {
          id: 42,
          name: "Acme",
          phone: "+233500000000",
          country_code: "GH",
          slug: null,
          is_active: true,
          created_at: "2025-01-01T00:00:00Z",
          credit_pool_used: 0,
          credit_pool_limit: null,
        },
        { count: 0 },
        { count: 0 },
        { count: 0 },
        [],
      ];
      let i = 0;
      supabaseFrom.mockImplementation(() => chainable(() => results[i++]));
      const out = await merchantService.getMyMerchantWithStats(42);
      expect(out!.credit_pool_limit).toBeNull();
      expect(out!.credit_pool_used).toBe(0);
    });
  });

  describe("updateMyMerchant", () => {
    it("throws when supabase update returns an error", async () => {
      setFromResult({ error: { message: "boom" } });
      await expect(
        merchantService.updateMyMerchant(42, { name: "New" }),
      ).rejects.toThrow("Failed to update merchant: boom");
    });

    it("updates only provided fields and refetches", async () => {
      const updateResult = { error: null };
      const merchantRow = {
        id: 42,
        name: "New",
        phone: "+233500000000",
        country_code: "GH",
        slug: "acme",
        is_active: true,
        created_at: "2025-01-01T00:00:00Z",
        credit_pool_used: 0,
        credit_pool_limit: null,
      };
      const results: any[] = [
        updateResult,
        merchantRow,
        { count: 1 },
        { count: 2 },
        { count: 3 },
        [],
      ];
      let i = 0;
      supabaseFrom.mockImplementation(() => chainable(() => results[i++]));
      const out = await merchantService.updateMyMerchant(42, { name: "New" });
      expect(out!.name).toBe("New");
    });
  });
});