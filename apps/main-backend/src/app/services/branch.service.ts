import { supabaseAdmin } from "../utils/supabase.client";
import { QueryFragments } from "../constants/queryFragments";
import {
  BranchWithAggregates,
  CreateBranchRequest,
  UpdateBranchRequest,
} from "../schemas/branch.schema";

/**
 * Branch service — list/create/update branches for a merchant with
 * per-branch aggregates. Ownership is enforced: every read/write verifies
 * the branch belongs to the requesting merchant.
 */
export class BranchService {
  /**
   * List all branches for a merchant with staff_count, customer_count,
   * credit_issued_this_month, and last_activity_date aggregates.
   */
  async listBranchesForMerchant(
    merchantId: number,
  ): Promise<BranchWithAggregates[]> {
    const { data: branches, error } = await supabaseAdmin
      .from("branches")
      .select(QueryFragments.BASE_BRANCH)
      .eq("merchant_id", merchantId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (error || !branches) return [];

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthStartMs = Math.floor(monthStart.getTime() / 1000);

    const results = await Promise.all(
      branches.map(async (b): Promise<BranchWithAggregates> => {
        // staff_count
        const { count: staffCount } = await supabaseAdmin
          .from("staff")
          .select("id", { count: "exact", head: true })
          .eq("branch_id", b.id)
          .is("deleted_at", null);

        // customer_count — distinct customers who have transacted at this branch
        // (server-side aggregate via RPC; the branch_customer junction is gone).
        const { data: custCountRes, error: custCountErr } = await supabaseAdmin.rpc(
          "get_distinct_customer_count",
          {
            p_merchant_id: merchantId,
            p_branch_id: b.id,
          },
        );
        if (custCountErr) {
          throw new Error(
            `Failed to load branch customer count: ${custCountErr.message}`,
          );
        }
        const customerCount =
          custCountRes == null ? 0 : Number(custCountRes as unknown);

        // credit_issued_this_month — sum of credit_generated this month
        const { data: issuedRows } = await supabaseAdmin
          .from("customer_transactions")
          .select("credit_generated")
          .eq("branch_id", b.id)
          .gte("transaction_date", monthStartMs)
          .is("deleted_at", null)
          .not("credit_generated", "is", null);

        const creditIssuedThisMonth = (issuedRows || []).reduce(
          (sum, r) => sum + Number(r.credit_generated ?? 0),
          0,
        );

        // last_activity_date — max transaction_date as ISO string
        const { data: lastRow } = await supabaseAdmin
          .from("customer_transactions")
          .select("transaction_date")
          .eq("branch_id", b.id)
          .is("deleted_at", null)
          .order("transaction_date", { ascending: false })
          .limit(1)
          .maybeSingle();

        const lastActivityDate = lastRow?.transaction_date
          ? new Date(Number(lastRow.transaction_date) * 1000).toISOString()
          : null;

        return {
          id: b.id,
          merchant_id: b.merchant_id,
          name: b.name,
          phone: b.phone,
          address: b.address,
          city: b.city,
          country_code: b.country_code,
          is_active: b.is_active,
          created_at: b.created_at,
          staff_count: staffCount ?? 0,
          customer_count: customerCount ?? 0,
          credit_issued_this_month: creditIssuedThisMonth,
          last_activity_date: lastActivityDate,
        };
      }),
    );

    return results;
  }

  /**
   * Create a new branch for a merchant.
   */
  async createBranch(
    merchantId: number,
    payload: CreateBranchRequest,
  ): Promise<BranchWithAggregates> {
    const { data: branch, error } = await supabaseAdmin
      .from("branches")
      .insert({
        merchant_id: merchantId,
        name: payload.name,
        phone: payload.phone ?? null,
        address: payload.address ?? null,
        city: payload.city,
        country_code: payload.country_code,
        is_active: true,
      })
      .select(QueryFragments.BASE_BRANCH)
      .single();

    if (error || !branch) {
      throw new Error(
        `Failed to create branch: ${error?.message ?? "unknown"}`,
      );
    }

    return {
      id: branch.id,
      merchant_id: branch.merchant_id,
      name: branch.name,
      phone: branch.phone,
      address: branch.address,
      city: branch.city,
      country_code: branch.country_code,
      is_active: branch.is_active,
      created_at: branch.created_at,
      staff_count: 0,
      customer_count: 0,
      credit_issued_this_month: 0,
      last_activity_date: null,
    };
  }

  /**
   * Update a branch. Verifies the branch belongs to the merchant before
   * applying changes; throws 403-equivalent if ownership fails.
   */
  async updateBranch(
    branchId: number,
    merchantId: number,
    payload: UpdateBranchRequest,
  ): Promise<BranchWithAggregates> {
    // Ownership check
    const { data: existing, error: lookupError } = await supabaseAdmin
      .from("branches")
      .select("id, merchant_id")
      .eq("id", branchId)
      .is("deleted_at", null)
      .maybeSingle();

    if (lookupError || !existing) {
      throw new Error("Branch not found");
    }
    if (existing.merchant_id !== merchantId) {
      const err = new Error(
        "Forbidden: branch does not belong to your merchant",
      );
      (err as Error & { statusCode?: number }).statusCode = 403;
      throw err;
    }

    const update: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (payload.name !== undefined) update.name = payload.name;
    if (payload.phone !== undefined) update.phone = payload.phone;
    if (payload.address !== undefined) update.address = payload.address;
    if (payload.city !== undefined) update.city = payload.city;
    if (payload.country_code !== undefined)
      update.country_code = payload.country_code;

    const { error } = await supabaseAdmin
      .from("branches")
      .update(update)
      .eq("id", branchId);

    if (error) {
      throw new Error(`Failed to update branch: ${error.message}`);
    }

    // Re-fetch with aggregates via list and pick the matching id
    const all = await this.listBranchesForMerchant(merchantId);
    const updated = all.find((b) => b.id === branchId);
    if (!updated) throw new Error("Branch not found after update");
    return updated;
  }
}

export const branchService = new BranchService();
