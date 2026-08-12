import { StyleSheet, Text, View } from "react-native";
import { ScreenBackground } from "../../components/ScreenBackground";
import { GlassCard } from "../../components/GlassCard";
import { GlassTransition } from "../../components/GlassTransition";
import { useAuthStore } from "../../store/useAuthStore";

export function HomeScreen() {
  const user = useAuthStore((s) => s.user);

  const name =
    [user?.surname, user?.other_names].filter(Boolean).join(" ").trim() ||
    "Customer";

  return (
    <ScreenBackground>
      <GlassTransition>
        <View style={styles.container}>
          <Text style={styles.title}>Home</Text>
          <GlassCard style={styles.card}>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.name}>{name}</Text>
            <Text style={styles.phone}>{user?.phone ?? "—"}</Text>
          </GlassCard>
        </View>
      </GlassTransition>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
  },
  title: {
    color: "#ffffff",
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
    marginBottom: 24,
  },
  card: {
    marginHorizontal: 0,
  },
  greeting: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    marginBottom: 4,
  },
  name: {
    color: "#ffffff",
    fontSize: 22,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 4,
  },
  phone: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
});