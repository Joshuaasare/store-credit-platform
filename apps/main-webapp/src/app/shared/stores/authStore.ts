import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  accessTokenStorage,
  tryRefreshToken,
  createAuthService,
} from "@store-credit-platform/api-services";
import { AuthUser, AuthSession } from "@shared/types/api.types";

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  setSession: (session: AuthSession) => void;
  setUser: (user: AuthUser) => void;
  logout: () => void;
  initialize: () => Promise<void>;
}

// Guard against concurrent initialize calls (e.g. React StrictMode double-mount)
let initPromise: Promise<void> | null = null;

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isLoading: true,
      isAuthenticated: false,

      setSession: (session: AuthSession) => {
        accessTokenStorage.setAccessToken(session.access_token);
        set({ user: session.user, isAuthenticated: true, isLoading: false });
      },

      setUser: (user: AuthUser) => {
        set({ user, isAuthenticated: true, isLoading: false });
      },

      logout: () => {
        accessTokenStorage.clearAccessToken();
        set({ user: null, isAuthenticated: false, isLoading: false });
      },

      initialize: async () => {
        if (initPromise) return initPromise;

        initPromise = (async () => {
          const authService = createAuthService();

          async function fetchUser(): Promise<AuthUser | null> {
            try {
              const data = await authService.getCurrentUser();
              if (data.success) return data.data;
            } catch {
              // ignore — will fall through to refresh attempt
            }
            return null;
          }

          let user = await fetchUser();

          if (!user) {
            // Try silent refresh using httpOnly cookie
            const refreshed = await tryRefreshToken();
            if (refreshed) {
              user = await fetchUser();
            }
          }

          if (user) {
            set({ user, isAuthenticated: true, isLoading: false });
          } else {
            accessTokenStorage.clearAccessToken();
            set({ user: null, isAuthenticated: false, isLoading: false });
          }
        })();

        try {
          await initPromise;
        } finally {
          initPromise = null;
        }
      },
    }),
    {
      name: "auth-store",
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
