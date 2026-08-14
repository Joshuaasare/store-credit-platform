import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useColorScheme } from "react-native";
import {
  lightTheme,
  darkTheme,
  type Theme,
  type ThemeMode,
} from "./theme";

interface ThemeContextValue {
  /** The resolved, active theme object (light or dark — never "system"). */
  theme: Theme;
  /** The user's override preference. */
  mode: ThemeMode;
  /** The effective scheme actually rendered ("light" | "dark"). */
  resolvedMode: "light" | "dark";
  /** Set an explicit override, or restore to follow the system. */
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * App-wide theme provider. Defaults to `system` (follows useColorScheme),
 * with an in-memory override for an explicit light/dark preference. Persist
 * the override (AsyncStorage / expo-secure-store) when the settings screen
 * lands — the provider's contract won't change.
 *
 * Place once near the root, ABOVE `NavigationContainer` so both the nav chrome
 * and screen contents see the same theme.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>("system");

  const resolvedMode = useMemo<"light" | "dark">(
    () =>
      mode === "system"
        ? systemScheme === "light"
          ? "light"
          : "dark"
        : mode,
    [mode, systemScheme],
  );

  const theme = useMemo<Theme>(
    () => (resolvedMode === "dark" ? darkTheme : lightTheme),
    [resolvedMode],
  );

  const setMode = useCallback((next: ThemeMode) => setModeState(next), []);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, mode, resolvedMode, setMode }),
    [theme, mode, resolvedMode, setMode],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

/**
 * Read the active theme. Throws if used outside `ThemeProvider` — surfaces a
 * wiring mistake early instead of rendering with a fallback theme.
 */
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within <ThemeProvider>");
  }
  return ctx;
}

/** Convenience: just the theme object (colors + radii + spacing + type). */
export function useThemeTokens(): Theme {
  return useTheme().theme;
}