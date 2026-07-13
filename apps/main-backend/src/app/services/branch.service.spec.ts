import { branchService } from "./branch.service";
import { supabaseAdmin } from "../utils/supabase.client";

jest.mock("../utils/supabase.client", () => ({
  supabaseAdmin: { from: jest.fn() },
}));

const supabaseFrom = supabaseAdmin.from as jest.Mock;

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
  obj.then = (resolve: any) =>
    Promise.resolve(wrapResult(resolver())).then(resolve);
  return obj;
}

function setFromResult(result: any) {
  supabaseFrom.mockImplementation(() => chainable(() => result));
}

describe("BranchService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("listBranchesForMerchant", () => {
    it("returns empty list when there are no branches", async () => {
      setFromResult({ data: [], error: null });
      const out = await branchService.listBranchesForMerchant(42);
      expect(out).toEqual([]);
    });

    it("returns empty list when supabase returns an error", async () => {
      setFromResult({ data: null, error: { message: "boom" } });
      const out = await branchService.listBranchesForMerchant(42);
      expect(out).toEqual([]);
    });

    it("aggregates staff_count, customer_count, monthly credit, last activity per branch", async () => {
      const branches = [
        {
          id: 1,
          merchant_id: 42,
          name: "Branch A",
          phone: "+233500000001",
          address: "Road 1",
          city: "Accra",
          country_code: "GH",
          is_active: true,
          created_at: "2025-01-01T00:00:00Z",
        },
      ];
      let call = 0;
      supabaseFrom.mockImplementation(() => {
        call++;
        if (call === 1) {
          return chainable(() => ({ data: branches, error: null }));
        }
        const perBranchResults: any[] = [
          { count: 4 },
          { count: 9 },
          [{ credit_generated: 50 }, { credit_generated: 25 }],
          { transaction_date: 1756500000 },
        ];
        const idx = (call - 2) % 4;
        return chainable(() => perBranchResults[idx]);
      });

      const out = await branchService.listBranchesForMerchant(42);
      expect(out).toHaveLength(1);
      expect(out[0].staff_count).toBe(4);
      expect(out[0].customer_count).toBe(9);
      expect(out[0].credit_issued_this_month).toBe(75);
      expect(out[0].last_activity_date).not.toBeNull();
    });

    it("returns null last_activity_date when branch has no transactions", async () => {
      const branches = [
        {
          id: 1,
          merchant_id: 42,
          name: "Branch A",
          phone: null,
          address: null,
          city: "Accra",
          country_code: "GH",
          is_active: true,
          created_at: "2025-01-01T00:00:00Z",
        },
      ];
      let call = 0;
      supabaseFrom.mockImplementation(() => {
        call++;
        if (call === 1) {
          return chainable(() => ({ data: branches, error: null }));
        }
        const perBranchResults: any[] = [
          { count: 0 },
          { count: 0 },
          [],
          null,
        ];
        const idx = (call - 2) % 4;
        return chainable(() => perBranchResults[idx]);
      });

      const out = await branchService.listBranchesForMerchant(42);
      expect(out[0].last_activity_date).toBeNull();
      expect(out[0].credit_issued_this_month).toBe(0);
    });
  });

  describe("createBranch", () => {
    it("throws on supabase insert error", async () => {
      setFromResult({ error: { message: "insert failed" } });
      await expect(
        branchService.createBranch(42, {
          name: "New",
          city: "Accra",
          country_code: "GH",
        }),
      ).rejects.toThrow("Failed to create branch: insert failed");
    });

    it("inserts and returns a fresh branch with zeroed aggregates", async () => {
      const branch = {
        id: 10,
        merchant_id: 42,
        name: "New",
        phone: null,
        address: null,
        city: "Accra",
        country_code: "GH",
        is_active: true,
        created_at: "2025-01-02T00:00:00Z",
      };
      setFromResult(branch);
      const out = await branchService.createBranch(42, {
        name: "New",
        city: "Accra",
        country_code: "GH",
      });
      expect(out.id).toBe(10);
      expect(out.staff_count).toBe(0);
      expect(out.customer_count).toBe(0);
      expect(out.credit_issued_this_month).toBe(0);
      expect(out.last_activity_date).toBeNull();
    });
  });

  describe("updateBranch", () => {
    it("rejects when branch does not exist", async () => {
      setFromResult(null);
      await expect(
        branchService.updateBranch(99, 42, { name: "X" }),
      ).rejects.toThrow("Branch not found");
    });

    it("rejects with 403 when branch belongs to another merchant", async () => {
      setFromResult({ id: 5, merchant_id: 999 });
      await expect(
        branchService.updateBranch(5, 42, { name: "X" }),
      ).rejects.toThrow(/Forbidden/);
    });

    it("updates and refetches the branch when ownership passes", async () => {
      const existing = { id: 5, merchant_id: 42 };
      const branches = [
        {
          id: 5,
          merchant_id: 42,
          name: "Updated",
          phone: null,
          address: null,
          city: "Tema",
          country_code: "GH",
          is_active: true,
          created_at: "2025-01-01T00:00:00Z",
        },
      ];
      const results: any[] = [
        existing,
        { error: null },
        { data: branches, error: null },
        { count: 1 },
        { count: 2 },
        [],
        null,
      ];
      let i = 0;
      supabaseFrom.mockImplementation(() => chainable(() => results[i++]));
      const out = await branchService.updateBranch(5, 42, {
        name: "Updated",
        city: "Tema",
      });
      expect(out.id).toBe(5);
      expect(out.name).toBe("Updated");
      expect(out.city).toBe("Tema");
      expect(out.staff_count).toBe(1);
    });
  });
});