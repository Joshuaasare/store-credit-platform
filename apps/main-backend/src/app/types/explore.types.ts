import { ApiErrorResponse } from "./main.types";

export interface ExploreBranch {
  id: number;
  name: string | null;
  city: string;
  latitude: number | null;
  longitude: number | null;
}

export interface ExploreOffer {
  kind: "fixed" | "running";
  config_group_id: string;
  merchant_name: string;
  merchant_slug: string | null;
  branch: ExploreBranch;
  branch_count: number;
  distance_km: number | null;
  image_url: string | null;
  headline: string;
  subtext: string | null;
  start_date: number | null;
  end_date: number | null;
}

export interface CustomerExploreOffersResponse {
  success: true;
  data: ExploreOffer[];
}

export type CustomerExploreOffersApiResponse =
  | CustomerExploreOffersResponse
  | ApiErrorResponse;