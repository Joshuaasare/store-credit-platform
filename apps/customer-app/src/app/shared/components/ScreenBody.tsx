import { SafeAreaView, type Edge } from "react-native-safe-area-context";
import type { ReactNode } from "react";

const EDGES: Edge[] = ["top", "bottom"];

export default function ScreenBody({
  children,
  edges,
  padding,
}: {
  children: ReactNode;
  edges?: Edge[];
  padding?: number;
}) {
  return (
    <SafeAreaView
      edges={edges ?? EDGES}
      style={{
        flex: 1,
        paddingHorizontal: padding ?? 24,
        paddingBottom: padding ?? 24,
      }}
    >
      {children}
    </SafeAreaView>
  );
}
