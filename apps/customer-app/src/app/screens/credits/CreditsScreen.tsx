import { StyleSheet, Text, View } from "react-native";
import { ScreenBackground } from "../../components/ScreenBackground";
import { GlassCard } from "../../components/GlassCard";
import { GlassTransition } from "../../components/GlassTransition";

export function CreditsScreen() {
  return (
    <ScreenBackground>
      <GlassTransition>
        <View style={styles.container}>
          <Text style={styles.title}>Credits</Text>
          <GlassCard style={styles.card}>
            <Text style={styles.placeholder}>
              Your active credit offers will appear here.
            </Text>
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
  placeholder: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
});