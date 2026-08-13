import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type ListRenderItem,
} from "react-native";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import type { CustomerActivity } from "@store-credit-platform/api-services";
import ActivityRow from "../../../shared/components/ActivityRow";
import { useThemeTokens } from "../../../theme/ThemeContext";

const keyExtractor = (item: CustomerActivity) => `${item.kind}-${item.id}`;

const renderActivityRow: ListRenderItem<CustomerActivity> = ({
  item,
  index,
}) => <ActivityRow activity={item} showSeparator={index > 0} />;

export default function RecentActivitySection({
  previewLoading,
  previewError,
  previewItems,
  onOpenActivitiesModal,
  sectionAnimatedStyle,
}: {
  previewLoading: boolean;
  previewError: Error | null;
  previewItems: CustomerActivity[];
  onOpenActivitiesModal: () => void;
  sectionAnimatedStyle: ReturnType<typeof useAnimatedStyle>;
}) {
  const theme = useThemeTokens();
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeaderRow}>
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

      <Animated.View
        style={[
          styles.activityContainer,
          styles.activityContainerTuck,
          sectionAnimatedStyle,
        ]}
      >
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
            scrollEnabled={false}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.activityListContent}
          />
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 24,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  seeAllPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  activityContainer: {
    overflow: "hidden",
  },
  // Tucks the activity list 4px up under the section header so the
  // "recent activities in between" complaint resolves: rows feel
  // attached to their header rather than floating below it.
  activityContainerTuck: {
    marginTop: -4,
  },
  activityListContent: {
    paddingBottom: 4,
  },
  placeholderRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
  },
});
