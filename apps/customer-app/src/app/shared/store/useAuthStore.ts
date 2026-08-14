import { create } from "zustand";
import type { CustomerAuthUser } from "@store-credit-platform/api-services";
import * as SecureStore from "expo-secure-store";
import { customerAuthService, wireAccessToken } from "../../api/client";
import { SECURE_STORE_KEYS } from "../../config";

export type AuthStatus =
  | "idle"
  | "loading"
  | "authenticated"
  | "unauthenticated";

interface SessionPayload {
  access_token: string;
  refresh_token: string;
  user: CustomerAuthUser;
}

interface AuthState {
  status: AuthStatus;
  accessToken: string | null;
  refreshToken: string | null;
  user: CustomerAuthUser | null;
  pendingToken: string | null;
  error: string | null;
  hydrate: () => Promise<void>;
  setSession: (session: SessionPayload) => Promise<void>;
  setPending: (token: string) => void;
  clearPending: () => void;
  setError: (message: string | null) => void;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => {
  // Wire the access-token source into the API client so 401-triggered
  // refreshes read/write the store's token. Runs once at store creation.
  wireAccessToken(
    () => get().accessToken,
    (t) => set({ accessToken: t }),
  );

  return {
    status: "idle",
    accessToken: null,
    refreshToken: null,
    user: null,
    pendingToken: null,
    error: null,

    async hydrate() {
      set({ status: "loading", error: null });
      const storedRefresh = await SecureStore.getItemAsync(
        SECURE_STORE_KEYS.REFRESH_TOKEN,
      );
      if (!storedRefresh) {
        set({ status: "unauthenticated" });
        return;
      }
      try {
        const res = await customerAuthService.refresh(storedRefresh);
        if (res.success) {
          await get().setSession({
            access_token: res.data.access_token,
            refresh_token: res.data.refresh_token,
            user: res.data.user,
          });
        } else {
          await SecureStore.deleteItemAsync(SECURE_STORE_KEYS.REFRESH_TOKEN);
          set({ status: "unauthenticated", refreshToken: null });
        }
      } catch {
        await SecureStore.deleteItemAsync(SECURE_STORE_KEYS.REFRESH_TOKEN);
        set({ status: "unauthenticated", refreshToken: null });
      }
    },

    async setSession(session) {
      await SecureStore.setItemAsync(
        SECURE_STORE_KEYS.REFRESH_TOKEN,
        session.refresh_token,
      );
      set({
        accessToken: session.access_token,
        refreshToken: session.refresh_token,
        user: session.user,
        pendingToken: null,
        status: "authenticated",
        error: null,
      });
    },

    setPending(token) {
      set({ pendingToken: token });
    },

    clearPending() {
      set({ pendingToken: null });
    },

    setError(message) {
      set({ error: message });
    },

    async logout() {
      const rt = get().refreshToken;
      if (rt) {
        try {
          await customerAuthService.logout(rt);
        } catch {
          // Best-effort — clear local state regardless.
        }
      }
      await SecureStore.deleteItemAsync(SECURE_STORE_KEYS.REFRESH_TOKEN);
      set({
        accessToken: null,
        refreshToken: null,
        user: null,
        pendingToken: null,
        status: "unauthenticated",
        error: null,
      });
    },
  };
});
