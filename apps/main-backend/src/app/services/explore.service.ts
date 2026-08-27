import { supabaseAdmin } from "../utils/supabase.client";
import { QueryFragments } from "../constants/queryFragments";
import { ExploreBranch, ExploreOffer } from "../types/explore.types";
import { haversineKm } from "../utils/geo.utils";

type MerchantEmbed = { name: string; slug: string | null } | null;

interface BranchEmbed {
  id: number;
  name: string | null;
  city: string;
  latitude: number | null;
  longitude: number | null;
  merchant: MerchantEmbed;
}

function pickNearestBranch(
  branches: BranchEmbed[],
  custLat: number | null,
  custLng: number | null,
): BranchEmbed | null {
  if (branches.length === 0) return null;
  if (custLat == null || custLng == null) return branches[0] ?? null;
  let best = branches[0];
  let bestD =
    haversineKm(custLat, custLng, best.latitude, best.longitude) ?? Infinity;
  for (let i = 1; i < branches.length; i++) {
    const d =
      haversineKm(
        custLat,
        custLng,
        branches[i].latitude,
        branches[i].longitude,
      ) ?? Infinity;
    if (d < bestD) {
      best = branches[i];
      bestD = d;
    }
  }
  return best;
}

function toExploreBranch(b: BranchEmbed | null): ExploreBranch {
  return {
    id: b?.id ?? 0,
    name: b?.name ?? null,
    city: b?.city ?? "",
    latitude: b?.latitude ?? null,
    longitude: b?.longitude ?? null,
  };
}

function asStringArray(images: unknown): string[] | null {
  if (!Array.isArray(images)) return null;
  return images.filter((v): v is string => typeof v === "string");
}

function runningHeadline(g: {
  credit_type: string | null;
  percentage_credit_value: number | null;
  fixed_credit_value: number | null;
  threshold_amount: number | null;
}): string {
  if (g.credit_type === "percentage") {
    const pct = g.percentage_credit_value ?? 0;
    if (g.threshold_amount != null) {
      return `${pct}% cashback on purchases over GH₵${g.threshold_amount}`;
    }
    return `${pct}% cashback on every purchase`;
  }
  if (g.credit_type === "fixed") {
    const v = g.fixed_credit_value ?? 0;
    return `GH₵${v} back per qualifying purchase`;
  }
  return "Cashback offer";
}

function merchantNameOf(b: BranchEmbed | null): string {
  return b?.merchant?.name ?? "";
}

function merchantSlugOf(b: BranchEmbed | null): string | null {
  return b?.merchant?.slug ?? null;
}

export class ExploreService {
  async listExploreOffers(customerId: number): Promise<ExploreOffer[]> {
    const { data: customer } = await supabaseAdmin
      .from("customers")
      .select("latitude,longitude")
      .eq("id", customerId)
      .single();
    const custLat = customer?.latitude ?? null;
    const custLng = customer?.longitude ?? null;

    const nowMs = Date.now();

    const runningSelect = `${QueryFragments.BASE_RUNNING_CREDIT_CONFIG}, branch:branches!inner(${QueryFragments.BASE_BRANCH}, merchant:merchants(name, slug))` as const;
    const fixedSelect = `${QueryFragments.BASE_FIXED_CREDIT_CONFIG}, branch:branches!inner(${QueryFragments.BASE_BRANCH}, merchant:merchants(name, slug))` as const;

    const [runningRes, fixedRes] = await Promise.all([
      supabaseAdmin
        .from("running_credit_config")
        .select(runningSelect)
        .is("deleted_at", null)
        .eq("is_active", true)
        .is("branch.deleted_at", null),
      supabaseAdmin
        .from("fixed_credit_config")
        .select(fixedSelect)
        .is("deleted_at", null)
        .eq("is_active", true)
        .lte("start_date", nowMs)
        .gte("end_date", nowMs)
        .is("branch.deleted_at", null),
    ]);

    if (runningRes.error)
      throw new Error(`explore running: ${runningRes.error.message}`);
    if (fixedRes.error)
      throw new Error(`explore fixed: ${fixedRes.error.message}`);

    const runningRows = runningRes.data ?? [];
    const fixedRows = fixedRes.data ?? [];

    const runningGroups = new Map<
      string,
      {
        config_group_id: string;
        branches: BranchEmbed[];
        credit_type: string | null;
        fixed_credit_value: number | null;
        percentage_credit_value: number | null;
        threshold_amount: number | null;
        terms: string | null;
        images: string[] | null;
      }
    >();
    for (const row of runningRows) {
      const gid = row.config_group_id;
      if (runningGroups.has(gid)) continue;
      const groupRows = runningRows.filter(
        (r) => r.config_group_id === gid,
      );
      const branches = groupRows
        .map((r) => r.branch)
        .filter((b): b is NonNullable<typeof b> => b != null);
      runningGroups.set(gid, {
        config_group_id: gid,
        branches,
        credit_type: row.credit_type,
        fixed_credit_value: row.fixed_credit_value,
        percentage_credit_value: row.percentage_credit_value,
        threshold_amount: row.threshold_amount,
        terms: row.terms,
        images: asStringArray(row.images),
      });
    }

    const fixedGroups = new Map<
      string,
      {
        config_group_id: string;
        branches: BranchEmbed[];
        title: string | null;
        description: string | null;
        start_date: number | null;
        end_date: number | null;
        images: string[] | null;
      }
    >();
    for (const row of fixedRows) {
      const gid = row.config_group_id;
      if (!gid || fixedGroups.has(gid)) continue;
      const groupRows = fixedRows.filter((r) => r.config_group_id === gid);
      const branches = groupRows
        .map((r) => r.branch)
        .filter((b): b is NonNullable<typeof b> => b != null);
      fixedGroups.set(gid, {
        config_group_id: gid,
        branches,
        title: row.title,
        description: row.description,
        start_date: row.start_date,
        end_date: row.end_date,
        images: asStringArray(row.images),
      });
    }

    const runningOffers: ExploreOffer[] = Array.from(
      runningGroups.values(),
    ).map((g) => {
      const nearest = pickNearestBranch(g.branches, custLat, custLng);
      const distance = haversineKm(
        custLat,
        custLng,
        nearest?.latitude ?? null,
        nearest?.longitude ?? null,
      );
      return {
        kind: "running",
        config_group_id: g.config_group_id,
        merchant_name: merchantNameOf(nearest),
        merchant_slug: merchantSlugOf(nearest),
        branch: toExploreBranch(nearest),
        branch_count: g.branches.length,
        distance_km: distance,
        image_url: g.images?.[0] ?? null,
        headline: runningHeadline(g),
        subtext: g.terms ?? null,
        start_date: null,
        end_date: null,
      };
    });

    const fixedOffers: ExploreOffer[] = Array.from(fixedGroups.values()).map(
      (g) => {
        const nearest = pickNearestBranch(g.branches, custLat, custLng);
        const distance = haversineKm(
          custLat,
          custLng,
          nearest?.latitude ?? null,
          nearest?.longitude ?? null,
        );
        return {
          kind: "fixed",
          config_group_id: g.config_group_id,
          merchant_name: merchantNameOf(nearest),
          merchant_slug: merchantSlugOf(nearest),
          branch: toExploreBranch(nearest),
          branch_count: g.branches.length,
          distance_km: distance,
          image_url: g.images?.[0] ?? null,
          headline: g.title ?? "",
          subtext: g.description ?? null,
          start_date: g.start_date,
          end_date: g.end_date,
        };
      },
    );

    return [...runningOffers, ...fixedOffers].sort((a, b) => {
      if (a.distance_km == null && b.distance_km == null) {
        return b.config_group_id.localeCompare(a.config_group_id);
      }
      if (a.distance_km == null) return 1;
      if (b.distance_km == null) return -1;
      return a.distance_km - b.distance_km;
    });
  }
}

export const exploreService = new ExploreService();