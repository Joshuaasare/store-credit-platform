import { useInfiniteQuery } from "@tanstack/react-query";
import type { CustomerFavoritesPageApiResponse } from "@store-credit-platform/api-services";
import { customerConfigInteractionService } from "../../api/client";

const FAVORITES_FEED_KEY = ["customer", "favorites", "page"] as const;

export const FAVORITES_PAGE_SIZE = 20;

export function useFavoritesFeed() {
  return useInfiniteQuery({
    queryKey: FAVORITES_FEED_KEY,
    initialPageParam: 0,
    queryFn: ({ pageParam }: { pageParam: number }) =>
      customerConfigInteractionService.listFavoritesPage({
        offset: pageParam,
        limit: FAVORITES_PAGE_SIZE,
      }),
    getNextPageParam: (lastPage: CustomerFavoritesPageApiResponse) => {
      if (!lastPage.success) return undefined;
      const { rows, total, offset } = lastPage.data;
      return offset + rows.length < total ? offset + rows.length : undefined;
    },
  });
}

export type FavoritesFeedQuery = ReturnType<typeof useFavoritesFeed>;