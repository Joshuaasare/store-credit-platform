import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  BaseFixedCreditConfig,
  BaseRunningCreditConfig,
} from "@store-credit-platform/api-services";
import { customerConfigInteractionService } from "../../api/client";

type FavoriteConfigType = "running" | "fixed";

type FavoritesData = {
  running: (BaseRunningCreditConfig & { favorited_at: string })[];
  fixed: (BaseFixedCreditConfig & { favorited_at: string })[];
};

// Config-data caches whose favorite_count / rows the mutations mutate.
const CONFIG_DATA_KEYS = [
  ["customer", "branchesNearby"],
  ["customer", "branchesSearch"],
  ["customer", "favorites", "page"],
] as const;

const favKey = (configType: FavoriteConfigType, configId: number) =>
  `${configType}:${configId}`;

export function useCustomerFavorites() {
  const queryClient = useQueryClient();

  // Optimistic per-config deltas: +1 on favorite, −1 on unfavorite. The heart
  // and count derive from these so they flip instantly with no spinner; the
  // background refetches below reconcile, and once fresh data lands the bases
  // already include the mutation's effect, so the deltas reset to zero.
  const [deltas, setDeltas] = useState<Record<string, number>>({});

  const query = useQuery({
    queryKey: ["customer-favorites"],
    queryFn: async (): Promise<FavoritesData> => {
      const res = await customerConfigInteractionService.listFavorites();
      if (!res.success) throw new Error(res.error);
      return res.data;
    },
  });

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["customer-favorites"] }),
      ...CONFIG_DATA_KEYS.map((key) =>
        queryClient.invalidateQueries({ queryKey: key }),
      ),
    ]);
    setDeltas({});
  };

  const addMutation = useMutation({
    mutationFn: async (vars: {
      configType: FavoriteConfigType;
      configId: number;
    }) => {
      const res = await customerConfigInteractionService.addFavorite(vars);
      if (!res.success) throw new Error(res.error);
    },
    onMutate: ({ configType, configId }) =>
      setDeltas((d) => ({
        ...d,
        [favKey(configType, configId)]: (d[favKey(configType, configId)] ?? 0) + 1,
      })),
    onSettled: () => void invalidate(),
  });

  const removeMutation = useMutation({
    mutationFn: async (vars: {
      configType: FavoriteConfigType;
      configId: number;
    }) => {
      const res = await customerConfigInteractionService.removeFavorite(vars);
      if (!res.success) throw new Error(res.error);
    },
    onMutate: ({ configType, configId }) =>
      setDeltas((d) => ({
        ...d,
        [favKey(configType, configId)]: (d[favKey(configType, configId)] ?? 0) - 1,
      })),
    onSettled: () => void invalidate(),
  });

  const isFavorited = (configType: FavoriteConfigType, configId: number) => {
    const delta = deltas[favKey(configType, configId)] ?? 0;
    if (delta > 0) return true;
    if (delta < 0) return false;
    if (!query.data) return false;
    const list = configType === "running" ? query.data.running : query.data.fixed;
    return list.some((c) => c.id === configId);
  };

  const countFor = (
    configType: FavoriteConfigType,
    configId: number,
    base: number,
  ) => Math.max(0, base + (deltas[favKey(configType, configId)] ?? 0));

  const toggleFavorite = (
    configType: FavoriteConfigType,
    configId: number,
  ) => {
    if (isFavorited(configType, configId)) {
      removeMutation.mutate({ configType, configId });
    } else {
      addMutation.mutate({ configType, configId });
    }
  };

  const pendingFor = (configType: FavoriteConfigType, configId: number) =>
    (addMutation.isPending &&
      addMutation.variables?.configType === configType &&
      addMutation.variables?.configId === configId) ||
    (removeMutation.isPending &&
      removeMutation.variables?.configType === configType &&
      removeMutation.variables?.configId === configId);

  return {
    isFavorited,
    countFor,
    toggleFavorite,
    pendingFor,
  };
}