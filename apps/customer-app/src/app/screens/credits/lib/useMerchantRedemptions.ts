import { useQuery } from "@tanstack/react-query";
import type {
  CustomerRedemptionRow,
  CustomerRedemptionStatus,
} from "@store-credit-platform/api-services";
import { customerRedemptionsService } from "../../../api/client";

/**
 * Hook that fetches the customer's full redemption feed at one merchant
 * (pending + approved + rejected merged, newest-first by `created_at`)
 * and pre-bucketed into `{ pending, approved, rejected }` arrays so the
 * consumer doesn't re-walk the list.
 *
 * The query key is namespaced by `merchantId` so multiple merchant
 * detail screens mounted in parallel (e.g. tab navigator) get isolated
 * caches.
 *
 * On cancel: invalidate this key so the cancelled row disappears from
 * the redeemed tab, AND invalidate `["customer", "credits"]` so the
 * Available tab's `pending_total` / `remaining` recompute.
 */
export function useMerchantRedemptions(merchantId: number) {
  const query = useQuery({
    queryKey: ["customer", "redemptions", "merchant", merchantId],
    queryFn: () =>
      customerRedemptionsService.getMyRedemptions({
        merchantId,
        status: "all",
      }),
  });

  const all: CustomerRedemptionRow[] = query.data?.success
    ? query.data.data
    : [];

  const buckets: Record<CustomerRedemptionStatus, CustomerRedemptionRow[]> = {
    pending: [],
    approved: [],
    rejected: [],
  };

  for (const row of all) {
    if (row.rejected_at != null) {
      buckets.rejected.push(row);
    } else if (row.approved_at != null) {
      buckets.approved.push(row);
    } else {
      buckets.pending.push(row);
    }
  }

  return {
    pending: buckets.pending,
    approved: buckets.approved,
    rejected: buckets.rejected,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

/** Stable query-key factory for invalidation from outside the hook. */
export function merchantRedemptionsQueryKey(merchantId: number) {
  return ["customer", "redemptions", "merchant", merchantId] as const;
}
