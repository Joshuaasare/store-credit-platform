import { useEffect } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  View,
  LogBox,
} from "react-native";
import { useFonts } from "expo-font";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import * as SplashScreen from "expo-splash-screen";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAuthStore } from "./store/useAuthStore";
import { RootNavigator } from "./navigation/RootNavigator";
import { ThemeProvider, useThemeTokens } from "./theme/ThemeContext";

SplashScreen.preventAutoHideAsync();

// Single shared QueryClient for the customer app. Created once at module
// scope so it survives re-renders. Defaults are fine for the credits screen
// (stale-while-revalidate); tune per-query via the useQuery options.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 1 minute before a background refetch is triggered — keeps the credits
      // list snappy on tab switches without hammering the backend.
      staleTime: 60 * 1000,
      // Don't auto-refetch on mount if we have data within the stale window.
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function AppShell() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  const status = useAuthStore((s) => s.status);
  const hydrate = useAuthStore((s) => s.hydrate);
  const theme = useThemeTokens();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (fontsLoaded && status !== "idle" && status !== "loading") {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, status]);

  if (!fontsLoaded || status === "idle" || status === "loading") {
    return (
      <View style={[styles.loading, { backgroundColor: theme.colors.backgroundSolid }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <RootNavigator />
    </QueryClientProvider>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppShell />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});

LogBox.ignoreLogs(["Require cycle:"]);