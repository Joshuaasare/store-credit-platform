import {
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
import ErrorState from "../../../shared/components/ErrorState";
import { RowSkeleton } from "../../../shared/components/Skeleton";
import { friendlyErrorMessage } from "../../../shared/utils/errorDisplay";
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
  onRetry,
  retrying,
}: {
  previewLoading: boolean;
  previewError: Error | null;
  previewItems: CustomerActivity[];
  onOpenActivitiesModal: () => void;
  onRetry: () => void;
  retrying: boolean;
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

  const renderContent = () => {
    if (previewLoading && previewItems.length === 0) {
      return (
        <View style={styles.placeholderRow}>
          <RowSkeleton />
          <RowSkeleton />
        </View>
      );
    }
    if (previewError && previewItems.length === 0) {
      return (
        <ErrorState
          compact
          style={{ paddingVertical: 16 }}
          title="Couldn't load activity"
          message={friendlyErrorMessage(
            previewError,
            "We couldn't load your recent activity. Please try again.",
          )}
          onRetry={onRetry}
          retrying={retrying}
        />
      );
    }
    if (previewItems.length === 0) {
      return (
        <Text
          style={{
            color: theme.colors.textMuted,
            fontFamily: theme.typography.fontFamilyRegular,
            fontSize: 14,
          }}
        >
          No activity yet — visit a merchant to get started.
        </Text>
      );
    }
    return (
      <FlatList
        data={previewItems}
        keyExtractor={keyExtractor}
        renderItem={renderActivityRow}
        ItemSeparatorComponent={ItemSeparator}
        scrollEnabled={false}
        showsVerticalScrollIndicator={false}
      />
    );
  };

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

        {renderContent()}
      </GlassCard>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 24,
    paddingHorizontal: 24,
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
    paddingVertical: 4,
  },
});
