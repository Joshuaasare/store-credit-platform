import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { CustomerRedemptionRow } from "@store-credit-platform/api-services";
import { useThemeTokens } from "../../../shared/theme/ThemeContext";
import RedemptionRow from "./RedemptionRow";

/**
 * Collapsible disclosure at the bottom of the "Credits Redeemed" tab.
 *
 * Collapsed: a single tappable row showing "Show {N} rejected" with a
 * down-chevron. Tap → expand to render the rejected rows inline.
 *
 * Expanded: the rejected `RedemptionRow`s render flat (same row template
 * as the active list, minus the cancel button because rejected rows are
 * terminal — the cancel handler is omitted). A second disclosure row at
 * the bottom reads "Hide rejected" with an up-chevron.
 *
 * Renders nothing when `rejected` is empty — the parent can call it
 * unconditionally.
 */
export default function RejectedSection({
  rejected,
}: {
  rejected: CustomerRedemptionRow[];
}) {
  const theme = useThemeTokens();
  const [expanded, setExpanded] = useState(false);

  if (rejected.length === 0) return null;

  return (
    <View style={styles.wrap}>
      {expanded
        ? rejected.map((row) => (
            <RedemptionRow key={row.id} redemption={row} />
          ))
        : null}
      <Pressable
        onPress={() => setExpanded((v) => !v)}
        accessibilityRole="button"
        accessibilityLabel={
          expanded
            ? `Hide ${rejected.length} rejected`
            : `Show ${rejected.length} rejected`
        }
        hitSlop={8}
        style={({ pressed }) => [
          styles.disclosure,
          {
            borderColor: theme.colors.surfaceBorder,
            opacity: pressed ? 0.85 : 1,
          },
        ]}
      >
        <Text
          style={{
            color: theme.colors.textSecondary,
            fontFamily: theme.typography.fontFamilySemiBold,
            fontSize: 13,
          }}
        >
          {expanded
            ? `Hide ${rejected.length} rejected`
            : `Show ${rejected.length} rejected`}
        </Text>
        <Ionicons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={16}
          color={theme.colors.textSecondary}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 16,
  },
  disclosure: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
  },
});
