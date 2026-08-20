import { supabaseAdmin } from "../utils/supabase.client";
import { QueryFragments } from "../constants/queryFragments";
import {
  BranchWithAggregates,
  CreateBranchRequest,
  UpdateBranchRequest,
} from "../schemas/branch.schema";

// Ownership enforced: every read/write verifies the branch belongs to the requesting merchant.
export class BranchService {
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

    const results = await Promise.all(
      branches.map(async (b): Promise<BranchWithAggregates> => {
        const { count: staffCount } = await supabaseAdmin
          .from("staff")
          .select("id", { count: "exact", head: true })
          .eq("branch_id", b.id)
          .is("deleted_at", null);

        // distinct customer count via RPC — the branch_customer junction is gone.
        const { data: custCountRes, error: custCountErr } =
          await supabaseAdmin.rpc("get_distinct_customer_count", {
            p_merchant_id: merchantId,
            p_branch_id: b.id,
          });
        if (custCountErr) {
          throw new Error(
            `Failed to load branch customer count: ${custCountErr.message}`,
          );
        }
        const customerCount =
          custCountRes == null ? 0 : Number(custCountRes);

        // credit_issued_this_month — sum of customer_credit.credit_amount (the old customer_transactions.credit_generated column is gone).
        const monthStartIso = monthStart.toISOString();
        const { data: issuedRows } = await supabaseAdmin
          .from("customer_credit")
          .select("credit_amount, created_at")
          .eq("branch_id", b.id)
          .gte("created_at", monthStartIso)
          .is("deleted_at", null)
          .is("revoked_at", null);

        const creditIssuedThisMonth = (issuedRows || []).reduce(
          (sum, r) => sum + Number(r.credit_amount ?? 0),
          0,
        );

        // Redemptions have no denormalized branch_id — scope via credit_id → customer_credit.branch_id, so fetch the branch's credit IDs first.
        const [lastPurchase, lastCredit, branchCreditIds] = await Promise.all([
          supabaseAdmin
            .from("customer_purchases")
            .select("transaction_date")
            .eq("branch_id", b.id)
            .is("deleted_at", null)
            .order("transaction_date", { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabaseAdmin
            .from("customer_credit")
            .select("created_at")
            .eq("branch_id", b.id)
            .is("deleted_at", null)
            .is("revoked_at", null)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabaseAdmin
            .from("customer_credit")
            .select("id")
            .eq("branch_id", b.id)
            .is("deleted_at", null)
            .is("revoked_at", null),
        ]);

        const branchCreditIdList = (branchCreditIds.data ?? []).map(
          (c) => c.id,
        );
        let lastRedemption: { data: { created_at: string } | null; error: { message: string } | null } = {
          data: null,
          error: null,
        };
        if (branchCreditIdList.length > 0) {
          lastRedemption = await supabaseAdmin
            .from("customer_credit_redemptions")
            .select("created_at")
            .in("credit_id", branchCreditIdList)
            .is("deleted_at", null)
            .not("approved_at", "is", null)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
        }

        const candidateMs: number[] = [];
        if (lastPurchase.data?.transaction_date) {
          candidateMs.push(Number(lastPurchase.data.transaction_date));
        }
        if (lastCredit.data?.created_at) {
          candidateMs.push(new Date(lastCredit.data.created_at).getTime());
        }
        if (lastRedemption.data?.created_at) {
          candidateMs.push(new Date(lastRedemption.data.created_at).getTime());
        }
        const lastActivityDate =
          candidateMs.length > 0
            ? new Date(Math.max(...candidateMs)).toISOString()
            : null;

        return {
          ...b,
          staff_count: staffCount ?? 0,
          customer_count: customerCount ?? 0,
          credit_issued_this_month: creditIssuedThisMonth,
          last_activity_date: lastActivityDate,
        };
      }),
    );

    return results;
  }

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
      ...branch,
      staff_count: 0,
      customer_count: 0,
      credit_issued_this_month: 0,
      last_activity_date: null,
    };
  }

  // Verifies the branch belongs to the merchant; throws a 403-equivalent on ownership failure.
  async updateBranch(
    branchId: number,
    merchantId: number,
    payload: UpdateBranchRequest,
  ): Promise<BranchWithAggregates> {
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

    const all = await this.listBranchesForMerchant(merchantId);
    const updated = all.find((b) => b.id === branchId);
    if (!updated) throw new Error("Branch not found after update");
    return updated;
  }
}

export const branchService = new BranchService();
