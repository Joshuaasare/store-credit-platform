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

// Merchant-scoped activity feed (union of customer_purchases + customer_credit + approved customer_credit_redemptions) and purchase recording (auto-creates customer by phone, auto-issues matching running credit configs). The union is synthesized into a single CustomerTransactions-shaped row so the frontend row type doesn't change; the `type` filter is applied before pagination so total + page reflect only the requested kind.
export class TransactionService {
  private static readonly DEFAULT_LIMIT = 20;

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
    const purchasesSelect = `${QueryFragments.BASE_CUSTOMER_PURCHASE},
         customer:customers(${QueryFragments.BASE_CUSTOMER},
         users(${QueryFragments.BASE_USER_PROFILE})),
         branch:branches(${QueryFragments.BASE_BRANCH}),
         recorded_by_staff:staff(${QueryFragments.BASE_STAFF})` as const;
    let query = supabaseAdmin
      .from("customer_purchases")
      .select(purchasesSelect)
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
    const creditSelect =
      `id, customer_id, branch_id, credit_amount, created_at,transaction_date,
         customer:customers(${QueryFragments.BASE_CUSTOMER}, users(${QueryFragments.BASE_USER_PROFILE})),
         branch:branches(${QueryFragments.BASE_BRANCH})` as const;
    let query = supabaseAdmin
      .from("customer_credit")
      .select(creditSelect)
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
    const redemptionSelect = `${QueryFragments.BASE_CUSTOMER_CREDIT_REDEMPTION},
         customer:customers(${QueryFragments.BASE_CUSTOMER}, users(${QueryFragments.BASE_USER_PROFILE})),
         branch:branches(${QueryFragments.BASE_BRANCH}),
         approved_by_staff:staff!approved_by_staff_id(${QueryFragments.BASE_STAFF})` as const;
    let query = supabaseAdmin
      .from("customer_credit_redemptions")
      .select(redemptionSelect)
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

  // Auto-creates the customer by phone if missing; matching running configs are auto-issued after the purchase — issuance failures are logged but do not fail the purchase (the purchase row is the source of truth). Branch resolution: explicit payload.branch_id (must belong to the caller's merchant), then the caller's JWT branch_id. Returns the purchase row shaped as CustomerTransactions so the frontend can drop it into the feed.
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

    // Branch-level purchase_threshold_amount is the minimum a purchase must
    // meet to be eligible for entry/recording at all — keeps merchants from
    // having to log every tiny purchase, and only counts worthwhile purchases
    // toward the cashback threshold. Enforced here (per branch) so the rule is
    // unambiguous regardless of how many running configs the branch has.
    const { data: branchRow, error: branchErr } = await supabaseAdmin
      .from("branches")
      .select(QueryFragments.BASE_BRANCH)
      .eq("id", branchId)
      .maybeSingle();
    if (branchErr || !branchRow) {
      throw new Error("Selected branch was not found");
    }
    if (branchRow.deleted_at != null || !branchRow.is_active) {
      throw new Error("Selected branch is not active");
    }
    if (branchRow.merchant_id !== merchantId) {
      const err = new Error(
        "Forbidden: branch does not belong to your merchant",
      );
      (err as Error & { statusCode?: number }).statusCode = 403;
      throw err;
    }
    const entryMin = branchRow.purchase_threshold_amount;
    if (entryMin != null && Number(payload.amount) < Number(entryMin)) {
      throw new Error(
        `Purchase amount GH₵${Number(payload.amount).toFixed(2)} is below this branch's minimum entry of GH₵${Number(entryMin).toFixed(2)}`,
      );
    }

    const phone = normalizePhone(payload.phone);

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
         recorded_by_staff:staff(${QueryFragments.BASE_STAFF})` as const,
      )
      .single();

    if (txErr || !txRow) {
      throw new Error(
        `Failed to record purchase: ${txErr?.message ?? "unknown"}`,
      );
    }

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

    return {
      ...txRow,
      transaction_type: "purchase",
      amount: Number(txRow.amount),
    };
  }
}

export const transactionService = new TransactionService();
