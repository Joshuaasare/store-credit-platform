import { create } from "zustand";
import {
  createStoreService,
} from "@store-credit-platform/api-services";
import {
  MerchantWithStats,
  BranchWithAggregates,
  CreateBranchRequest,
  UpdateBranchRequest,
  UpdateMerchantRequest,
} from "@shared/types/api.types";
import { isApiError } from "@shared/utils/api.utils";

interface StoreState {
  merchant: MerchantWithStats | null;
  branches: BranchWithAggregates[];
  loading: boolean;
  error: string | null;

  fetchStore: () => Promise<void>;
  ensureStoreLoaded: () => Promise<void>;
  refreshBranches: () => Promise<void>;
  createBranch: (payload: CreateBranchRequest) => Promise<BranchWithAggregates>;
  updateBranch: (
    id: number,
    payload: UpdateBranchRequest,
  ) => Promise<BranchWithAggregates>;
  updateMerchant: (
    payload: UpdateMerchantRequest,
  ) => Promise<MerchantWithStats>;
  reset: () => void;
}

const storeService = createStoreService();

export const useStoreStore = create<StoreState>((set, get) => ({
  merchant: null,
  branches: [],
  loading: false,
  error: null,

  fetchStore: async () => {
    set({ loading: true, error: null });
    try {
      const [merchantRes, branchesRes] = await Promise.all([
        storeService.getMyStore(),
        storeService.getMyBranches(),
      ]);
      if (isApiError(merchantRes)) throw new Error(merchantRes.error);
      if (isApiError(branchesRes)) throw new Error(branchesRes.error);
      set({
        merchant: merchantRes.data,
        branches: branchesRes.data,
        loading: false,
      });
    } catch (err) {
      set({
        loading: false,
        error: err instanceof Error ? err.message : "Failed to load store",
      });
    }
  },

  // Idempotent: skip fetch when merchant data already exists or is loading.
  ensureStoreLoaded: async () => {
    const { merchant, loading } = get();
    if (merchant != null || loading) return;
    await get().fetchStore();
  },

  refreshBranches: async () => {
    try {
      const res = await storeService.getMyBranches();
      if (isApiError(res)) throw new Error(res.error);
      set({ branches: res.data });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Failed to refresh branches",
      });
    }
  },

  createBranch: async (payload) => {
    // Aggregates need server compute, so we append the new row then refetch.
    const res = await storeService.createBranch(payload);
    if (isApiError(res)) throw new Error(res.error);
    set({ branches: [res.data, ...get().branches] });
    void get().refreshBranches();
    return res.data;
  },

  updateBranch: async (id, payload) => {
    const previous = get().branches;
    set({
      branches: previous.map((b) =>
        b.id === id
          ? {
              ...b,
              ...("name" in payload ? { name: payload.name } : {}),
              ...("phone" in payload ? { phone: payload.phone } : {}),
              ...("address" in payload ? { address: payload.address } : {}),
              ...("city" in payload ? { city: payload.city! } : {}),
              ...("country_code" in payload
                ? { country_code: payload.country_code! }
                : {}),
            }
          : b,
      ),
    });
    try {
      const res = await storeService.updateBranch(id, payload);
      if (isApiError(res)) throw new Error(res.error);
      set({
        branches: get().branches.map((b) => (b.id === id ? res.data : b)),
      });
      return res.data;
    } catch (err) {
      set({ branches: previous });
      throw err;
    }
  },

  updateMerchant: async (payload) => {
    const previous = get().merchant;
    if (previous) {
      set({
        merchant: {
          ...previous,
          ...("name" in payload ? { name: payload.name! } : {}),
          ...("phone" in payload ? { phone: payload.phone! } : {}),
          ...("country_code" in payload
            ? { country_code: payload.country_code! }
            : {}),
          ...("slug" in payload ? { slug: payload.slug ?? null } : {}),
          ...("logo_url" in payload ? { logo_url: payload.logo_url ?? null } : {}),
          ...("cover_photo_url" in payload
            ? { cover_photo_url: payload.cover_photo_url ?? null }
            : {}),
        },
      });
    }
    try {
      const res = await storeService.updateMyMerchant(payload);
      if (isApiError(res)) throw new Error(res.error);
      set({ merchant: res.data });
      return res.data;
    } catch (err) {
      set({ merchant: previous });
      throw err;
    }
  },

  reset: () =>
    set({ merchant: null, branches: [], loading: false, error: null }),
}));