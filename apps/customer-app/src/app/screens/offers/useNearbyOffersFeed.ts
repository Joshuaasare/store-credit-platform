import { useInfiniteQuery } from "@tanstack/react-query";
import { useAuthStore } from "../../shared/store/useAuthStore";
import { customerOfferService } from "../../api/client";

const PAGE_SIZE = 20;

// Lat/lng come from the customer's saved profile location (same source the
// Explore feed uses); the query stays disabled until a location exists.
export function useNearbyOffersFeed() {
  const user = useAuthStore((s) => s.user);
  const lat = user?.latitude ?? null;
  const lng = user?.longitude ?? null;
  const hasLocation = lat != null && lng != null;

  const query = useInfiniteQuery({
    queryKey: ["customer", "offersNearby", lat, lng],
    queryFn: ({ pageParam }) =>
      customerOfferService.getNearbyOffers(lat!, lng!, PAGE_SIZE, pageParam),
    enabled: hasLocation,
    initialPageParam: 0,
    getNextPageParam: (last) => {
      if (!last.success) return undefined;
      const page = last.data;
      return page.offset + page.limit < page.total
        ? page.offset + page.limit
        : undefined;
    },
  });

  return { lat, lng, hasLocation, query };
}