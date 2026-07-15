import { supabaseAdmin } from "../utils/supabase.client";
import { QueryFragments } from "../constants/queryFragments";
import { AccessTokenPayload } from "../schemas/auth.schema";
import {
  LeaderboardRow,
  LeaderboardSort,
  TransactionRow,
} from "../schemas/customers.schema";

// ────────────────────────────────────────────────────────────────────────────
// Input types
// ────────────────────────────────────────────────────────────────────────────

export interface LeaderboardFilters {
  sort?: LeaderboardSort;
  branchId?: number | null;
  start?: number | null;
  end?: number | null;
  limit?: number;
  offset?: number;
}

export interface TransactionsFilters {
  branchId?: number | null;
  start?: number | null;
  end?: number | null;
  limit?: number;
  offset?: number;
}

export interface LeaderboardPage {
  rows: LeaderboardRow[];
  total: number;
  offset: number;
  limit: number;
}

export interface LeaderboardStats {
  total_customers: number;
  total_purchases: number;
  total_credits_issued: number;
}

export interface TransactionsPage {
  rows: TransactionRow[];
  total: number;
  offset: number;
  limit: number;
}

export interface CreatePurchasePayload {
  phone: string;
  amount: number;
}

// ────────────────────────────────────────────────────────────────────────────
// Service
// ────────────────────────────────────────────────────────────────────────────

/**
 * Customer service — leaderboard (via Postgres RPC), transactions list
 * (via Supabase range queries), and purchase creation (auto-creates customer
 * + branch_customer junction row by phone).
 *
 * All reads/writes are scoped to a verified merchant_id resolved upstream
 * from the JWT. `amount` is canonical per `transaction_type`; `credit_generated`
 * / `credit_redeemed` columns are intentionally ignored.
 */
export class CustomerService {
  private static readonly DEFAULT_LIMIT = 20;

  /**
   * Leaderboard rows + total distinct customer count. Sort defaults to
   * `purchases`; tiebreak by `customer_id` asc (enforced in the RPC).
   */
  async getLeaderboard(
    merchantId: number,
    filters: LeaderboardFilters,
  ): Promise<LeaderboardPage> {
    const limit = filters.limit ?? CustomerService.DEFAULT_LIMIT;
    const offset = filters.offset ?? 0;
    const sort = filters.sort ?? "purchases";

    const rpcParams = {
      p_merchant_id: merchantId,
      p_branch_id: filters.branchId ?? null,
      p_sort: sort,
      p_start_epoch: filters.start ?? null,
      p_end_epoch: filters.end ?? null,
      p_limit: limit,
      p_offset: offset,
    };

    const [rowsResult, countResult] = await Promise.all([
      supabaseAdmin.rpc("get_customer_leaderboard", rpcParams),
      supabaseAdmin.rpc("get_customer_leaderboard_count", {
        p_merchant_id: merchantId,
        p_branch_id: filters.branchId ?? null,
        p_start_epoch: filters.start ?? null,
        p_end_epoch: filters.end ?? null,
      }),
    ]);

    if (rowsResult.error) {
      throw new Error(
        `Failed to load leaderboard: ${rowsResult.error.message}`,
      );
    }
    if (countResult.error) {
      throw new Error(
        `Failed to load leaderboard count: ${countResult.error.message}`,
      );
    }

    const rawRows = (rowsResult.data ?? []) as Array<Record<string, unknown>>;
    const rows: LeaderboardRow[] = rawRows.map((r) => ({
      customer_id: Number(r.customer_id),
      phone: (r.phone as string | null) ?? null,
      user_id: (r.user_id as string | null) ?? null,
      customer_name: (r.customer_name as string) ?? "Unnamed customer",
      branch_id:
        r.branch_id == null ? null : Number(r.branch_id as string | number),
      total_purchases: Number(r.total_purchases ?? 0),
      total_credits_issued: Number(r.total_credits_issued ?? 0),
      total_credits_redeemed: Number(r.total_credits_redeemed ?? 0),
      transaction_count: Number(r.transaction_count ?? 0),
    }));

    const total =
      countResult.data == null
        ? 0
        : Number((countResult.data as unknown));

    return { rows, total, offset, limit };
  }

  /**
   * Stats row for the leaderboard hero: total distinct customers, total
   * purchase amount, total credits issued in the window.
   */
  async getLeaderboardStats(
    merchantId: number,
    filters: Omit<LeaderboardFilters, "sort" | "limit" | "offset">,
  ): Promise<LeaderboardStats> {
    const rpcParams = {
      p_merchant_id: merchantId,
      p_branch_id: filters.branchId ?? null,
      p_start_epoch: filters.start ?? null,
      p_end_epoch: filters.end ?? null,
    };

    // Distinct customer count + sum-by-type via two RPC calls.
    const [countRes, rowsRes] = await Promise.all([
      supabaseAdmin.rpc("get_customer_leaderboard_count", rpcParams),
      // Pull all leaderboard rows (limit high) to sum metrics client-side.
      // Cheaper than a third RPC; total_customers is the distinct count.
      supabaseAdmin.rpc("get_customer_leaderboard", {
        ...rpcParams,
        p_sort: "purchases",
        p_limit: 100000,
        p_offset: 0,
      }),
    ]);

    if (countRes.error) {
      throw new Error(
        `Failed to load stats count: ${countRes.error.message}`,
      );
    }
    if (rowsRes.error) {
      throw new Error(
        `Failed to load stats rows: ${rowsRes.error.message}`,
      );
    }

    const allRows = (rowsRes.data ?? []) as Array<Record<string, unknown>>;
    const total_customers =
      countRes.data == null ? 0 : Number(countRes.data as unknown);
    const total_purchases = allRows.reduce(
      (s, r) => s + Number(r.total_purchases ?? 0),
      0,
    );
    const total_credits_issued = allRows.reduce(
      (s, r) => s + Number(r.total_credits_issued ?? 0),
      0,
    );

    return { total_customers, total_purchases, total_credits_issued };
  }

  /**
   * Merchant-scoped transactions list, ordered by transaction_date desc.
   * Uses Supabase `.range()` offset pagination with a parallel count query.
   */
  async getTransactions(
    merchantId: number,
    filters: TransactionsFilters,
  ): Promise<TransactionsPage> {
    const limit = filters.limit ?? CustomerService.DEFAULT_LIMIT;
    const offset = filters.offset ?? 0;

    // Fetch the merchant's branch IDs once (small array) so PostgREST can
    // filter via `.in("branch_id", ids)`.
    const { data: branchRows, error: branchError } = await supabaseAdmin
      .from("branches")
      .select("id")
      .eq("merchant_id", merchantId)
      .is("deleted_at", null);

    if (branchError) {
      throw new Error(`Failed to resolve branches: ${branchError.message}`);
    }
    const branchIds = (branchRows ?? []).map((b) => b.id);
    if (branchIds.length === 0) {
      return { rows: [], total: 0, offset, limit };
    }

    const baseQuery = supabaseAdmin
      .from("customer_transactions")
      .select(QueryFragments.CUSTOMER_TRANSACTION_WITH_JOINS)
      .in("branch_id", branchIds)
      .is("deleted_at", null)
      .order("transaction_date", { ascending: false });

    if (filters.branchId != null) {
      baseQuery.eq("branch_id", filters.branchId);
    }
    if (filters.start != null) {
      baseQuery.gte("transaction_date", filters.start);
    }
    if (filters.end != null) {
      baseQuery.lte("transaction_date", filters.end);
    }

    const countQuery = supabaseAdmin
      .from("customer_transactions")
      .select("id", { count: "exact", head: true })
      .in("branch_id", branchIds)
      .is("deleted_at", null);
    if (filters.branchId != null) {
      countQuery.eq("branch_id", filters.branchId);
    }
    if (filters.start != null) {
      countQuery.gte("transaction_date", filters.start);
    }
    if (filters.end != null) {
      countQuery.lte("transaction_date", filters.end);
    }

    const [pageRes, countRes] = await Promise.all([
      baseQuery.range(offset, offset + limit - 1),
      countQuery,
    ]);

    if (pageRes.error) {
      throw new Error(`Failed to load transactions: ${pageRes.error.message}`);
    }
    if (countRes.error) {
      throw new Error(
        `Failed to count transactions: ${countRes.error.message}`,
      );
    }

    const rows: TransactionRow[] = (pageRes.data ?? []).map((r) => {
      const row = r as unknown as Record<string, unknown>;
      const customer = (row.customer as Record<string, unknown> | null) ?? null;
      const user =
        (customer?.users as Record<string, unknown> | null) ?? null;
      const branch = (row.branch as Record<string, unknown> | null) ?? null;
      const recordedBy =
        (row.recorded_by_user as Record<string, unknown> | null) ?? null;

      const surname = (user?.surname as string | null) ?? null;
      const otherNames = (user?.other_names as string | null) ?? null;
      const name =
        surname || otherNames
          ? `${surname ?? ""}${surname && otherNames ? " " : ""}${otherNames ?? ""}`.trim()
          : null;

      return {
        id: Number(row.id),
        transaction_date: Number(row.transaction_date),
        amount: Number(row.amount),
        transaction_type: row.transaction_type as
          | "purchase"
          | "credit_issue"
          | "credit_redeem",
        customer_id: Number(row.customer_id),
        customer_name: name,
        customer_phone: (customer?.phone as string | null) ?? null,
        branch_id: Number(row.branch_id),
        branch_name: (branch?.name as string | null) ?? null,
        recorded_by_user_id:
          (row.recorded_by_user_id as string | null) ?? null,
        recorded_by_name: (recordedBy?.surname as string | null) ?? null,
      };
    });

    return {
      rows,
      total: countRes.count ?? 0,
      offset,
      limit,
    };
  }

  /**
   * Create a `purchase` transaction. Auto-creates the customer (by phone) and
   * the `branch_customer` junction row if missing. The caller's `branch_id`
   * must be present on the JWT (or resolved from staff); otherwise a 400 is
   * thrown. No credit-issuance logic — that is a separate future feature.
   */
  async createPurchase(
    user: AccessTokenPayload,
    payload: CreatePurchasePayload,
  ): Promise<TransactionRow> {
    // 1. Resolve caller's branch_id — prefer JWT, fallback to staff lookup.
    let branchId = user.branch_id;
    if (branchId == null) {
      const { data: staff } = await supabaseAdmin
        .from("staff")
        .select("id, branch_id")
        .eq("user_id", user.sub)
        .is("deleted_at", null)
        .order("id", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (!staff) {
        throw new Error("Caller has no assigned branch");
      }
      branchId = (staff as { branch_id: number }).branch_id;
    }
    if (branchId == null) {
      throw new Error("Caller has no assigned branch");
    }

    const phone = payload.phone.trim();

    // 2. Lookup existing customer by phone (deleted_at IS NULL).
    const { data: existing } = await supabaseAdmin
      .from("customers")
      .select(QueryFragments.BASE_CUSTOMER)
      .eq("phone", phone)
      .is("deleted_at", null)
      .maybeSingle();

    let customerId: number;
    if (existing) {
      customerId = existing.id;
    } else {
      const { data: created, error: createErr } = await supabaseAdmin
        .from("customers")
        .insert({ phone })
        .select(QueryFragments.BASE_CUSTOMER)
        .single();
      if (createErr || !created) {
        throw new Error(
          `Failed to create customer: ${createErr?.message ?? "unknown"}`,
        );
      }
      customerId = created.id;
    }

    // 3. Upsert branch_customer junction (deleted_at is required on insert).
    const { data: existingLink } = await supabaseAdmin
      .from("branch_customer")
      .select("id, deleted_at")
      .eq("branch_id", branchId)
      .eq("customer_id", customerId)
      .maybeSingle();

    if (!existingLink) {
      const { error: linkErr } = await supabaseAdmin
        .from("branch_customer")
        .insert({
          branch_id: branchId,
          customer_id: customerId,
          deleted_at: null,
        });
      if (linkErr) {
        throw new Error(
          `Failed to link customer to branch: ${linkErr.message}`,
        );
      }
    } else if (existingLink.deleted_at != null) {
      // Reactivate a soft-deleted link.
      const { error: reactivateErr } = await supabaseAdmin
        .from("branch_customer")
        .update({ deleted_at: null, updated_at: new Date().toISOString() })
        .eq("id", existingLink.id);
      if (reactivateErr) {
        throw new Error(
          `Failed to reactivate customer-branch link: ${reactivateErr.message}`,
        );
      }
    }

    // 4. Insert the purchase transaction row.
    const nowEpoch = Math.floor(Date.now() / 1000);
    const { data: txRow, error: txErr } = await supabaseAdmin
      .from("customer_transactions")
      .insert({
        customer_id: customerId,
        branch_id: branchId,
        recorded_by_user_id: user.sub,
        amount: payload.amount,
        transaction_type: "purchase",
        transaction_date: nowEpoch,
      })
      .select(QueryFragments.CUSTOMER_TRANSACTION_WITH_JOINS)
      .single();

    if (txErr || !txRow) {
      throw new Error(
        `Failed to record purchase: ${txErr?.message ?? "unknown"}`,
      );
    }

    const row = txRow as unknown as Record<string, unknown>;
    const customer = (row.customer as Record<string, unknown> | null) ?? null;
    const userRow =
      (customer?.users as Record<string, unknown> | null) ?? null;
    const branch = (row.branch as Record<string, unknown> | null) ?? null;
    const recordedBy =
      (row.recorded_by_user as Record<string, unknown> | null) ?? null;
    const surname = (userRow?.surname as string | null) ?? null;
    const otherNames = (userRow?.other_names as string | null) ?? null;
    const name =
      surname || otherNames
        ? `${surname ?? ""}${surname && otherNames ? " " : ""}${otherNames ?? ""}`.trim()
        : null;

    return {
      id: Number(row.id),
      transaction_date: Number(row.transaction_date),
      amount: Number(row.amount),
      transaction_type: row.transaction_type as
        | "purchase"
        | "credit_issue"
        | "credit_redeem",
      customer_id: Number(row.customer_id),
      customer_name: name,
      customer_phone: (customer?.phone as string | null) ?? null,
      branch_id: Number(row.branch_id),
      branch_name: (branch?.name as string | null) ?? null,
      recorded_by_user_id:
        (row.recorded_by_user_id as string | null) ?? null,
      recorded_by_name: (recordedBy?.surname as string | null) ?? null,
    };
  }
}

export const customerService = new CustomerService();