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
  theme: Theme;
  mode: ThemeMode;
  resolvedMode: "light" | "dark";
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

// Place once near the root, ABOVE `NavigationContainer` so nav + screens share
// the same theme. Override is in-memory; persist when the settings screen lands.
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

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within <ThemeProvider>");
  }
  return ctx;
}

export function useThemeTokens(): Theme {
  return useTheme().theme;
}