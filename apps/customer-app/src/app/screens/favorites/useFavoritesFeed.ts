import { useInfiniteQuery } from "@tanstack/react-query";
import type { CustomerFavoritesPageApiResponse } from "@store-credit-platform/api-services";
import { customerConfigInteractionService } from "../../api/client";

const FAVORITES_FEED_KEY = ["customer", "favorites", "page"] as const;

export const FAVORITES_PAGE_SIZE = 20;

// search: null = unfiltered feed (its own cache entry); a trimmed query gets a
// per-query cache key so toggling in and out of search keeps both warm.
export function useFavoritesFeed(search: string | null = null) {
  const trimmed = search?.trim() ?? "";
  return useInfiniteQuery({
    queryKey:
      trimmed.length > 0
        ? [...FAVORITES_FEED_KEY, "search", trimmed]
        : FAVORITES_FEED_KEY,
    initialPageParam: 0,
    queryFn: ({ pageParam }: { pageParam: number }) =>
      customerConfigInteractionService.listFavoritesPage({
        offset: pageParam,
        limit: FAVORITES_PAGE_SIZE,
        search: trimmed.length > 0 ? trimmed : undefined,
      }),
    getNextPageParam: (lastPage: CustomerFavoritesPageApiResponse) => {
      if (!lastPage.success) return undefined;
      const { rows, total, offset } = lastPage.data;
      return offset + rows.length < total ? offset + rows.length : undefined;
    },
  });
}

export type FavoritesFeedQuery = ReturnType<typeof useFavoritesFeed>;