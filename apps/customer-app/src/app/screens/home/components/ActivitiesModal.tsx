import { useCallback, useMemo } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ListRenderItem,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { CustomerActivity } from "@store-credit-platform/api-services";
import { useThemeTokens } from "../../../shared/theme/ThemeContext";
import ActivityRow from "../../../shared/components/ActivityRow";
import type { ActivitiesFeedQuery } from "../useActivitiesFeed";

/**
 * Bottom-sheet modal that owns the full "See all activity" list.
 *
 * The screen pre-fetches the feed query (so the cache is hot by the time
 * the user taps "See all"). This modal just renders the cached pages,
 * drives the FlatList's `onEndReached → fetchNextPage` plumbing, and
 * shows the "Loading more…" / "That's all your activity." footer.
 *
 * Visual model: slides up from the bottom over a dim scrim, the same
 * idiom as the country-picker sheet in `PhoneInput.tsx`. The scrim is
 * hardcoded `rgba(0,0,0,0.45)` because it's a one-off dim layer (not a
 * themed surface) and adding a `scrim` token is a separate theme change.
 */
type ActivitiesModalProps = {
  visible: boolean;
  onClose: () => void;
  feedQuery: ActivitiesFeedQuery;
  /**
   * Number of items shown in the in-section preview. Reserved for a
   * future "Showing N items" sub-header — currently unused at the call
   * site, but kept in the contract so the screen-side wiring is stable.
   */
  previewItemCount: number;
};

export default function ActivitiesModal({
  visible,
  onClose,
  feedQuery,
  previewItemCount: _previewItemCount,
}: ActivitiesModalProps) {
  const theme = useThemeTokens();

  // Flatten the paginated pages into a single item list. Re-derived
  // whenever the underlying pages array changes.
  const items = useMemo<CustomerActivity[]>(() => {
    const pages = feedQuery.data?.pages ?? [];
    const out: CustomerActivity[] = [];
    for (const page of pages) {
      if (page.success) out.push(...page.data.items);
    }
    return out;
  }, [feedQuery.data]);

  const keyExtractor = useCallback(
    (item: CustomerActivity) => `${item.kind}-${item.id}`,
    [],
  );
  const renderItem = useCallback<ListRenderItem<CustomerActivity>>(
    ({ item }) => <ActivityRow activity={item} />,
    [],
  );

  // Same inset hairline as the preview card — clears the icon disc + gap.
  const ItemSeparator = useCallback(
    () => (
      <View
        style={[
          styles.rowSeparator,
          { backgroundColor: theme.colors.sheetSeparator },
        ]}
      />
    ),
    [theme],
  );

  // Footer: hide entirely until we've tried to paginate at least once
  // (so a short history doesn't show a premature end-of-feed banner).
  // Once more than one page has loaded, show "Loading more…" mid-fetch
  // and "That's all your activity." when the feed is exhausted.
  const hasMultiplePages = (feedQuery.data?.pages.length ?? 0) > 1;
  const ListFooter = useCallback(() => {
    if (!hasMultiplePages) return null;
    if (feedQuery.isFetchingNextPage) {
      return (
        <View style={styles.footerRow}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
          <Text
            style={{
              color: theme.colors.textSecondary,
              fontFamily: theme.typography.fontFamilyRegular,
              fontSize: 13,
              marginLeft: 8,
            }}
          >
            Loading more…
          </Text>
        </View>
      );
    }
    if (!feedQuery.hasNextPage) {
      return (
        <Text
          style={{
            color: theme.colors.textMuted,
            fontFamily: theme.typography.fontFamilyRegular,
            fontSize: 13,
            textAlign: "center",
            paddingVertical: 12,
          }}
        >
          That’s all your activity.
        </Text>
      );
    }
    return null;
  }, [
    hasMultiplePages,
    feedQuery.isFetchingNextPage,
    feedQuery.hasNextPage,
    theme,
  ]);

  // Initial-load state — first page in flight, no items yet.
  if (feedQuery.isLoading && items.length === 0) {
    return (
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={onClose}
        statusBarTranslucent
      >
        <Pressable style={styles.overlay} onPress={onClose}>
          <Pressable
            style={[
              styles.sheet,
              {
                backgroundColor: theme.colors.sheet,
                borderTopLeftRadius: theme.radii.xl,
                borderTopRightRadius: theme.radii.xl,
              },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <View
              style={[
                styles.grabber,
                { backgroundColor: theme.colors.surfacePill },
              ]}
            />
            <View style={styles.headerRow}>
              <Text
                style={{
                  color: theme.colors.sheetText,
                  fontFamily: theme.typography.fontFamilySemiBold,
                  fontSize: 18,
                }}
              >
                All Activity
              </Text>
              <Pressable
                onPress={onClose}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel="Close activity"
                style={styles.closeButton}
              >
                <Ionicons
                  name="close"
                  size={24}
                  color={theme.colors.sheetText}
                />
              </Pressable>
            </View>
            <View style={styles.centerFill}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text
                style={{
                  color: theme.colors.sheetTextMuted,
                  fontFamily: theme.typography.fontFamilyRegular,
                  fontSize: 14,
                  marginTop: 12,
                }}
              >
                Loading activity…
              </Text>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    );
  }

  // Empty state — query succeeded, no items.
  if (feedQuery.isSuccess && items.length === 0) {
    return (
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={onClose}
        statusBarTranslucent
      >
        <Pressable style={styles.overlay} onPress={onClose}>
          <Pressable
            style={[
              styles.sheet,
              {
                backgroundColor: theme.colors.sheet,
                borderTopLeftRadius: theme.radii.xl,
                borderTopRightRadius: theme.radii.xl,
              },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <View
              style={[
                styles.grabber,
                { backgroundColor: theme.colors.surfacePill },
              ]}
            />
            <View style={styles.headerRow}>
              <Text
                style={{
                  color: theme.colors.sheetText,
                  fontFamily: theme.typography.fontFamilySemiBold,
                  fontSize: 18,
                }}
              >
                All Activity
              </Text>
              <Pressable
                onPress={onClose}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel="Close activity"
                style={styles.closeButton}
              >
                <Ionicons
                  name="close"
                  size={24}
                  color={theme.colors.sheetText}
                />
              </Pressable>
            </View>
            <View style={styles.centerFill}>
              <Text
                style={{
                  color: theme.colors.sheetTextMuted,
                  fontFamily: theme.typography.fontFamilyRegular,
                  fontSize: 14,
                  textAlign: "center",
                }}
              >
                No activity yet — visit a merchant to get started.
              </Text>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    );
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[
            styles.sheet,
            {
              backgroundColor: theme.colors.sheet,
              borderTopLeftRadius: theme.radii.xl,
              borderTopRightRadius: theme.radii.xl,
            },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          <View
            style={[
              styles.grabber,
              { backgroundColor: theme.colors.surfacePill },
            ]}
          />
          <View style={styles.headerRow}>
            <Text
              style={{
                color: theme.colors.sheetText,
                fontFamily: theme.typography.fontFamilySemiBold,
                fontSize: 18,
              }}
            >
              All Activity
            </Text>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Close activity"
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color={theme.colors.sheetText} />
            </Pressable>
          </View>
          <FlatList
            data={items}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            ItemSeparatorComponent={ItemSeparator}
            ListFooterComponent={ListFooter}
            onEndReached={() => {
              if (
                feedQuery.hasNextPage &&
                !feedQuery.isFetching &&
                !feedQuery.isFetchingNextPage
              ) {
                feedQuery.fetchNextPage();
              }
            }}
            onEndReachedThreshold={0.5}
            showsVerticalScrollIndicator
            contentContainerStyle={styles.listContent}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sheet: {
    paddingTop: 8,
    paddingBottom: 32,
    maxHeight: "85%",
  },
  grabber: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  closeButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  rowSeparator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 68, // clears the arrow + avatar ring + gaps
  },
  centerFill: {
    paddingVertical: 64,
    alignItems: "center",
    justifyContent: "center",
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
});
