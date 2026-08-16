import { FastifyBaseLogger } from "fastify";
import { supabaseAdmin } from "../utils/supabase.client";
import { QueryFragments } from "../constants/queryFragments";
import { AccessTokenPayload } from "../schemas/auth.schema";
import {
  TransactionsFilters,
  TransactionsPage,
  CreatePurchaseRequest,
  CustomerTransactions,
  TransactionTypeFilter,
} from "../schemas/transactions.schema";

import { issueRunningCreditsForPurchase } from "./creditConfig.service";
import { normalizePhone } from "../utils/phone.utils";

// ────────────────────────────────────────────────────────────────────────────
// Service
// ────────────────────────────────────────────────────────────────────────────

/**
 * Transaction service — merchant-scoped activity feed (union of
 * customer_purchases + customer_credit + customer_credit_redemptions) and
 * purchase recording (auto-creates customer by phone, auto-issues matching
 * running credit configs).
 *
 * The activity feed synthesizes a single `CustomerTransactions`-shaped row
 * from the union so the frontend doesn't have to change its row type. The
 * `type` filter (`all` | `purchase` | `credit_issue` | `credit_redeem`) is
 * applied after the union so the total + pagination reflect only the
 * requested type.
 */
export class TransactionService {
  private static readonly DEFAULT_LIMIT = 20;

  /**
   * Merchant-scoped activity feed, ordered by transaction_date desc.
   * Union of customer_purchases / customer_credit / approved
   * customer_credit_redemptions. `type` filters the union before pagination
   * so total + page reflect only that kind; "all" returns everything.
   */
  async getTransactions(
    merchantId: number,
    filters: TransactionsFilters,
  ): Promise<TransactionsPage> {
    const limit = filters.limit ?? TransactionService.DEFAULT_LIMIT;
    const offset = filters.offset ?? 0;
    const typeFilter: TransactionTypeFilter = filters.type ?? "all";
    const branchId = filters.branch_id;
    const branchIds = await this.resolveMerchantBranchIds(merchantId);

    if (branchIds.length === 0) {
      return { rows: [], total: 0, offset, limit };
    }
    const filteredBranchIds =
      branchId && branchIds.includes(branchId) ? [branchId] : branchIds;

    const AddPurchases = typeFilter === "all" || typeFilter === "purchase";
    const AddCredits = typeFilter === "all" || typeFilter === "credit_issue";
    const AddRedemptions =
      typeFilter === "all" || typeFilter === "credit_redeem";

    const [purchases, credits, redemptions] = await Promise.all([
      AddPurchases
        ? this.fetchPurchases(filteredBranchIds)
        : Promise.resolve([]),
      AddCredits ? this.fetchCredits(filteredBranchIds) : Promise.resolve([]),
      AddRedemptions
        ? this.fetchRedemptions(filteredBranchIds)
        : Promise.resolve([]),
    ]);

    const purchaseData: CustomerTransactions[] = purchases.map((r) => ({
      ...r,
      transaction_type: "purchase",
    }));

    const creditData: CustomerTransactions[] = credits.map((r) => ({
      ...r,
      transaction_type: "credit_issue",
      amount: Number(r.credit_amount),
    }));

    const redemptionData: CustomerTransactions[] = redemptions.map((r) => ({
      ...r,
      transaction_type: "credit_redeem",
      amount: Number(r.amount_redeemed),
    }));

    const merged = purchaseData
      .concat(creditData, redemptionData)
      .sort((a, b) => b.transaction_date - a.transaction_date);

    return {
      rows: merged.slice(offset, offset + limit),
      total: merged.length,
      offset,
      limit,
    };
  }

  private async resolveMerchantBranchIds(
    merchantId: number,
  ): Promise<number[]> {
    const { data, error } = await supabaseAdmin
      .from("branches")
      .select("id")
      .eq("merchant_id", merchantId)
      .is("deleted_at", null);
    if (error) {
      throw new Error(`Failed to resolve branches: ${error.message}`);
    }
    return (data ?? []).map((b) => b.id);
  }

  private async fetchPurchases(
    branchIds: number[],
    dateRange?: {
      from: number;
      to: number;
    },
  ) {
    let query = supabaseAdmin
      .from("customer_purchases")
      .select(
        `${QueryFragments.BASE_CUSTOMER_PURCHASE},
         customer:customers(${QueryFragments.BASE_CUSTOMER}, 
         users(${QueryFragments.BASE_USER_PROFILE})),
         branch:branches(${QueryFragments.BASE_BRANCH}),
         recorded_by_staff:staff(${QueryFragments.BASE_STAFF})`,
      )
      .in("branch_id", branchIds)
      .is("deleted_at", null)
      .order("transaction_date", { ascending: false });

    if (dateRange?.to && dateRange?.from) {
      query = query
        .gte("transaction_date", dateRange.from)
        .lte("transaction_date", dateRange.to);
    }
    const { data, error } = await query;

    if (error) throw new Error(`Failed to load purchases: ${error.message}`);
    return data;
  }

  private async fetchCredits(
    branchIds: number[],
    dateRange?: {
      from: number;
      to: number;
    },
  ) {
    let query = supabaseAdmin
      .from("customer_credit")
      .select(
        `id, customer_id, branch_id, credit_amount, created_at,transaction_date,
         customer:customers(${QueryFragments.BASE_CUSTOMER}, users(${QueryFragments.BASE_USER_PROFILE})),
         branch:branches(${QueryFragments.BASE_BRANCH})`,
      )
      .in("branch_id", branchIds)
      .is("deleted_at", null)
      .is("revoked_at", null)
      .order("created_at", { ascending: false });

    if (dateRange?.to && dateRange?.from) {
      query = query
        .gte("transaction_date", dateRange.from)
        .lte("transaction_date", dateRange.to);
    }

    const { data, error } = await query;
    if (error) throw new Error(`Failed to load credits: ${error.message}`);
    return data;
  }

  private async fetchRedemptions(
    branchIds: number[],
    dateRange?: {
      from: number;
      to: number;
    },
  ) {
    let query = supabaseAdmin
      .from("customer_credit_redemptions")
      .select(
        `${QueryFragments.BASE_CUSTOMER_CREDIT_REDEMPTION},
         customer:customers(${QueryFragments.BASE_CUSTOMER}, users(${QueryFragments.BASE_USER_PROFILE})),
         branch:branches(${QueryFragments.BASE_BRANCH}),
         approved_by_staff:staff!approved_by_staff_id(${QueryFragments.BASE_STAFF})`,
      )
      .in("branch_id", branchIds)
      .is("deleted_at", null)
      .not("approved_at", "is", null)
      .order("approved_at", { ascending: false });

    if (dateRange?.to && dateRange?.from) {
      query = query
        .gte("transaction_date", dateRange.from)
        .lte("transaction_date", dateRange.to);
    }

    const { data, error } = await query;
    if (error) throw new Error(`Failed to load redemptions: ${error.message}`);
    return data;
  }

  /**
   * Record a purchase in `customer_purchases` and auto-issue any matching
   * running credit configs. Auto-creates the customer (by phone) if missing.
   * Branch resolution order: explicit `payload.branch_id` (must belong to the
   * caller's merchant), then the caller's JWT `branch_id`. Credit-issuance
   * failures are logged but never fail the purchase — the purchase row is the
   * source of truth.
   *
   * Returns the purchase row shaped as the existing `CustomerTransactions`
   * type so the frontend can drop it straight into the activity feed.
   */
  async createPurchase(
    user: AccessTokenPayload,
    payload: CreatePurchaseRequest,
    merchantId: number,
    log?: FastifyBaseLogger,
  ): Promise<CustomerTransactions> {
    const branchId = payload.branch_id ?? user.branch_id;
    if (branchId == null) {
      throw new Error("Caller has no assigned branch");
    }

    const phone = normalizePhone(payload.phone);

    // 1. Lookup existing customer by phone (deleted_at IS NULL).
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

    const transactionDate = new Date().getTime();
    // 2. Insert the purchase row.
    const { data: txRow, error: txErr } = await supabaseAdmin
      .from("customer_purchases")
      .insert({
        customer_id: customerId,
        branch_id: branchId,
        recorded_by_staff_id: user.staff_id ?? null,
        amount: payload.amount,
        transaction_date: transactionDate,
      })
      .select(
        `${QueryFragments.BASE_CUSTOMER_PURCHASE},
         customer:customers(${QueryFragments.BASE_CUSTOMER}, users(${QueryFragments.BASE_USER_PROFILE})),
         branch:branches(${QueryFragments.BASE_BRANCH}),
         recorded_by_staff:staff(${QueryFragments.BASE_STAFF})`,
      )
      .single();

    if (txErr || !txRow) {
      throw new Error(
        `Failed to record purchase: ${txErr?.message ?? "unknown"}`,
      );
    }

    // Non-fatal: auto-issue running credits. The purchase row is the source of
    // truth; any issuance error is logged and swallowed.
    try {
      await issueRunningCreditsForPurchase(
        supabaseAdmin,
        merchantId,
        customerId,
        branchId,
        payload.amount,
        transactionDate,
      );
    } catch (err) {
      if (log)
        log.error(err, "issueRunningCreditsForPurchase failed (non-fatal)");
      else
        console.error("issueRunningCreditsForPurchase failed (non-fatal)", err);
    }

    // Reshape to the existing CustomerTransactions shape so the frontend stays
    // unchanged. transaction_type is synthesized as "purchase"; credit_id is
    // null because purchases don't reference a customer_credit row.
    return {
      ...txRow,
      transaction_type: "purchase",
      amount: Number(txRow.amount),
    };
  }
}

export const transactionService = new TransactionService();
