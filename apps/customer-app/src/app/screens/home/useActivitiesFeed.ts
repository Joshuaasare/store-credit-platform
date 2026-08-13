import { useInfiniteQuery } from "@tanstack/react-query";
import type { CustomerActivitiesApiResponse } from "@store-credit-platform/api-services";
import { customerActivitiesService } from "../../api/client";

const ACTIVITIES_FEED_KEY = ["customer", "activities", "feed"] as const;

export function useActivitiesFeed() {
  return useInfiniteQuery({
    queryKey: ACTIVITIES_FEED_KEY,
    initialPageParam: null as number | null,
    queryFn: ({ pageParam }: { pageParam: number | null }) =>
      customerActivitiesService.list({
        cursor: pageParam,
        limit: 20,
      }),
    getNextPageParam: (lastPage: CustomerActivitiesApiResponse) => {
      if (!lastPage.success) return undefined;
      return lastPage.data.nextCursor;
    },
  });
}

export type ActivitiesFeedQuery = ReturnType<typeof useActivitiesFeed>;
