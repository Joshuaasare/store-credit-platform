import { create } from "zustand";
import { persist } from "zustand/middleware";
import { supabase } from "../shared/lib/supabase";
import { AuthUser, AuthSession } from "../shared/types/api.types";

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  setSession: (session: AuthSession) => Promise<void>;
  setUser: (user: AuthUser) => void;
  logout: () => Promise<void>;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isLoading: true,
      isAuthenticated: false,

      setSession: async (session: AuthSession) => {
        await supabase.auth.setSession({
          access_token: session.access_token,
          refresh_token: session.refresh_token,
        });
        set({ user: session.user, isAuthenticated: true, isLoading: false });
      },

      setUser: (user: AuthUser) => {
        set({ user, isAuthenticated: true, isLoading: false });
      },

      logout: async () => {
        await supabase.auth.signOut();
        set({ user: null, isAuthenticated: false, isLoading: false });
      },

      initialize: async () => {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          set({ isLoading: false, isAuthenticated: false });
          return;
        }

        try {
          const response = await fetch("/api/auth/me", {
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          });

          if (!response.ok) {
            throw new Error("Session invalid");
          }

          const data = await response.json();
          if (data.success) {
            set({ user: data.data, isAuthenticated: true, isLoading: false });
          } else {
            throw new Error(data.error);
          }
        } catch {
          await supabase.auth.signOut();
          set({ user: null, isAuthenticated: false, isLoading: false });
        }
      },
    }),
    {
      name: "auth-store",
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    },
  ),
);
