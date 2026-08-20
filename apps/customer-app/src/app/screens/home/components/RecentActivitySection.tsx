import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type ListRenderItem,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { CustomerActivity } from "@store-credit-platform/api-services";
import ActivityRow from "../../../shared/components/ActivityRow";
import GlassCard from "../../../shared/components/GlassCard";
import { useThemeTokens } from "../../../shared/theme/ThemeContext";

const keyExtractor = (item: CustomerActivity) => `${item.kind}-${item.id}`;

const renderActivityRow: ListRenderItem<CustomerActivity> = ({ item }) => (
  <ActivityRow activity={item} />
);

export default function RecentActivitySection({
  previewLoading,
  previewError,
  previewItems,
  onOpenActivitiesModal,
}: {
  previewLoading: boolean;
  previewError: Error | null;
  previewItems: CustomerActivity[];
  onOpenActivitiesModal: () => void;
}) {
  const theme = useThemeTokens();

  const ItemSeparator = () => (
    <View
      style={[
        styles.separator,
        { backgroundColor: theme.colors.surfaceBorder },
      ]}
    />
  );

  return (
    <View style={styles.section}>
      <GlassCard padding={20}>
        <View style={styles.cardHeader}>
          <Text
            style={{
              color: theme.colors.text,
              fontFamily: theme.typography.fontFamilySemiBold,
              fontSize: 18,
              letterSpacing: 0.1,
            }}
          >
            Recent Activity
          </Text>
          <TouchableOpacity
            onPress={onOpenActivitiesModal}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="See all activity"
            style={styles.seeAllPill}
          >
            <Text
              style={{
                color: theme.colors.primary,
                fontFamily: theme.typography.fontFamilySemiBold,
                fontSize: 14,
              }}
            >
              See all
            </Text>
            <Ionicons
              name="arrow-forward"
              size={14}
              color={theme.colors.primary}
            />
          </TouchableOpacity>
        </View>

        {/* Body — list, loading, error, or empty, all inside the card */}
        {previewLoading && previewItems.length === 0 ? (
          <View style={styles.placeholderRow}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
            <Text
              style={{
                color: theme.colors.textSecondary,
                fontFamily: theme.typography.fontFamilyRegular,
                fontSize: 14,
                marginLeft: 8,
              }}
            >
              Loading activity…
            </Text>
          </View>
        ) : previewError && previewItems.length === 0 ? (
          <Text
            style={{
              color: theme.colors.error,
              fontFamily: theme.typography.fontFamilyRegular,
              fontSize: 14,
            }}
          >
            Couldn't load activity.
          </Text>
        ) : previewItems.length === 0 ? (
          <Text
            style={{
              color: theme.colors.textMuted,
              fontFamily: theme.typography.fontFamilyRegular,
              fontSize: 14,
            }}
          >
            No activity yet — visit a merchant to get started.
          </Text>
        ) : (
          <FlatList
            data={previewItems}
            keyExtractor={keyExtractor}
            renderItem={renderActivityRow}
            ItemSeparatorComponent={ItemSeparator}
            scrollEnabled={false}
            showsVerticalScrollIndicator={false}
          />
        )}
      </GlassCard>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 24,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  seeAllPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 68, // clears the arrow + avatar + gap (18 + 8 + 42 + 8 = 76, minus a touch)
  },
  placeholderRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
  },
});
