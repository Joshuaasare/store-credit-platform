import { SafeAreaView, type Edge } from "react-native-safe-area-context";
import type { ReactNode } from "react";
import { ViewStyle } from "react-native";

const EDGES: Edge[] = ["top", "bottom"];

export default function ScreenBody({
  children,
  edges,
  padding,
  style,
}: {
  children: ReactNode;
  edges?: Edge[];
  padding?: number;
  style?: ViewStyle;
}) {
  return (
    <SafeAreaView
      edges={edges ?? EDGES}
      style={{
        flex: 1,
        paddingHorizontal: padding ?? 24,
        paddingBottom: padding ?? 24,
        ...style,
      }}
    >
      {children}
    </SafeAreaView>
  );
}
