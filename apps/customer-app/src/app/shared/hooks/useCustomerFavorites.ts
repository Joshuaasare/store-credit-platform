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

export function useCustomerFavorites() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["customer-favorites"],
    queryFn: async (): Promise<FavoritesData> => {
      const res = await customerConfigInteractionService.listFavorites();
      if (!res.success) throw new Error(res.error);
      return res.data;
    },
  });

  const invalidate = () =>
    void queryClient.invalidateQueries({ queryKey: ["customer-favorites"] });

  const addMutation = useMutation({
    mutationFn: async (vars: {
      configType: FavoriteConfigType;
      configId: number;
    }) => {
      const res = await customerConfigInteractionService.addFavorite(vars);
      if (!res.success) throw new Error(res.error);
    },
    onSettled: invalidate,
  });

  const removeMutation = useMutation({
    mutationFn: async (vars: {
      configType: FavoriteConfigType;
      configId: number;
    }) => {
      const res = await customerConfigInteractionService.removeFavorite(vars);
      if (!res.success) throw new Error(res.error);
    },
    onSettled: invalidate,
  });

  const isFavorited = (configType: FavoriteConfigType, configId: number) => {
    if (!query.data) return false;
    const list =
      configType === "running" ? query.data.running : query.data.fixed;
    return list.some((c) => c.id === configId);
  };

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
    toggleFavorite,
    pendingFor,
  };
}