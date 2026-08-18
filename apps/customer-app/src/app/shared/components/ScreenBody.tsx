import { SafeAreaView, type Edge } from "react-native-safe-area-context";
import type { ReactNode } from "react";

const EDGES: Edge[] = ["top", "bottom"];

/**
 * Standard body wrapper for screens that should respect safe-area +
 * 24px page padding. Use this as the immediate child of `ScreenBackground`
 * for any screen that does NOT need to bleed edge-to-edge (e.g. a colored
 * header that fills the full screen width).
 *
 * Screens that need to bleed (e.g. the merchant-detail pink header) skip
 * this wrapper and own their own layout.
 */
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
