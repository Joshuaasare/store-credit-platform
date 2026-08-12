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
import { useAuthStore } from "./store/useAuthStore";
import { RootNavigator } from "./navigation/RootNavigator";

SplashScreen.preventAutoHideAsync();

export default function App() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  const status = useAuthStore((s) => s.status);
  const hydrate = useAuthStore((s) => s.hydrate);

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
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#0d9488" />
      </View>
    );
  }

  return <RootNavigator />;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0f766e",
  },
});

LogBox.ignoreLogs(["Require cycle:"]);