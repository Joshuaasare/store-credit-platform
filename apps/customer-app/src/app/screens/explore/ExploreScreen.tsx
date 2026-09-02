import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { useInfiniteQuery } from "@tanstack/react-query";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import type {
  BranchCategoryValues,
  BranchWithOffers,
} from "@store-credit-platform/api-services";
import ScreenBackground from "../../shared/components/ScreenBackground";
import ScreenBody from "../../shared/components/ScreenBody";
import PageHeader from "../../shared/components/PageHeader";
import { useAuthStore } from "../../shared/store/useAuthStore";
import { customerBranchService } from "../../api/client";
import { useOffsets } from "../../shared/hooks/useOffsets";
import { useTheme, useThemeTokens } from "../../shared/theme/ThemeContext";
import type { AppStackParamList } from "../../navigation/RootNavigator";
import LocationModal from "../../shared/components/LocationModal";
import CategoryFilterModal, {
  CATEGORY_LABELS,
} from "./components/CategoryFilterModal";
import BranchCard from "./components/BranchCard";

const PAGE_SIZE = 20;
const DEBOUNCE_MS = 300;

function useDebounced<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

export function ExploreScreen() {
  const theme = useThemeTokens();
  const { resolvedMode } = useTheme();
  const user = useAuthStore((s) => s.user);
  const { tabBarOffset } = useOffsets();
  const stackNavigation =
    useNavigation<NativeStackNavigationProp<AppStackParamList>>();

  const [searchMode, setSearchMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] =
    useState<BranchCategoryValues | null>(null);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);

  const debouncedQuery = useDebounced(searchQuery, DEBOUNCE_MS);

  const hasLocation = user?.latitude != null && user?.longitude != null;
  const lat = user?.latitude ?? null;
  const lng = user?.longitude ?? null;

  const nearbyQuery = useInfiniteQuery({
    queryKey: ["customer", "branchesNearby", lat, lng, activeCategory],
    queryFn: ({ pageParam = 0 }) =>
      customerBranchService.getBranchesByLocation(
        lat!,
        lng!,
        activeCategory ? [activeCategory] : null,
        PAGE_SIZE,
        pageParam,
      ),
    enabled: hasLocation && !searchMode,
    initialPageParam: 0,
    getNextPageParam: (last) => {
      if (!last.success) return undefined;
      const page = last.data;
      return page.offset + page.limit < page.total
        ? page.offset + page.limit
        : undefined;
    },
  });

  const searchQueryFn = useInfiniteQuery({
    queryKey: ["customer", "branchesSearch", lat, lng, debouncedQuery],
    queryFn: ({ pageParam = 0 }) =>
      customerBranchService.searchBranchesByLocation(
        lat!,
        lng!,
        debouncedQuery,
        PAGE_SIZE,
        pageParam,
      ),
    enabled: hasLocation && searchMode && debouncedQuery.trim().length > 0,
    initialPageParam: 0,
    getNextPageParam: (last) => {
      if (!last.success) return undefined;
      const page = last.data;
      return page.offset + page.limit < page.total
        ? page.offset + page.limit
        : undefined;
    },
  });

  const activeQuery = searchMode ? searchQueryFn : nearbyQuery;

  const branches: BranchWithOffers[] = useMemo(() => {
    if (!activeQuery.data) return [];
    return activeQuery.data.pages.flatMap((page) =>
      page.success ? page.data.rows : [],
    );
  }, [activeQuery.data]);

  const enterSearch = () => {
    setSearchMode(true);
    setActiveCategory(null);
  };
  const exitSearch = () => {
    setSearchMode(false);
    setSearchQuery("");
  };
  const applyCategory = (next: BranchCategoryValues | null) => {
    setActiveCategory(next);
    setSearchMode(false);
    setSearchQuery("");
  };

  const emptyStateText = searchMode
    ? debouncedQuery.trim().length === 0
      ? "Type to search branches by name or place."
      : "No branches match your search"
    : activeCategory != null
      ? `No branches in this category nearby`
      : "No branches near you yet";

  type ExploreListItem =
    | { type: "header" }
    | { type: "branch"; branch: BranchWithOffers };

  const listData: ExploreListItem[] = useMemo(() => {
    if (branches.length === 0) return [];
    return [
      { type: "header" },
      ...branches.map((b): ExploreListItem => ({ type: "branch", branch: b })),
    ];
  }, [branches]);

  const renderSearchArea = () => (
    <BlurView
      // intensity={resolvedMode === "dark" ? 45 : 30}
      intensity={0}
      tint={resolvedMode === "dark" ? "dark" : "light"}
      style={styles.searchAreaWrap}
    >
      {!searchMode ? (
        <View style={styles.headerRow}>
          <Pressable
            onPress={enterSearch}
            style={[
              styles.searchBar,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.surfaceBorder,
                borderRadius: theme.radii.pill,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Search branches"
          >
            <Ionicons name="search" size={16} color={theme.colors.textMuted} />
            <Text
              numberOfLines={1}
              style={{
                flex: 1,
                color: theme.colors.textMuted,
                fontFamily: theme.typography.fontFamilyRegular,
                fontSize: 14,
                marginLeft: 8,
              }}
            >
              Search brands and deals
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setCategoryModalOpen(true)}
            hitSlop={8}
            style={[
              styles.filterButton,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.surfaceBorder,
                borderRadius: theme.radii.pill,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Filter by category"
          >
            <Ionicons
              name="funnel-outline"
              size={16}
              // color={theme.colors.textOnPrimary}
              color={
                activeCategory ? theme.colors.primary : theme.colors.textMuted
              }
            />
          </Pressable>
        </View>
      ) : (
        <View
          style={[
            styles.searchInputRow,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.surfaceBorder,
              borderRadius: theme.radii.pill,
            },
          ]}
        >
          <Pressable
            onPress={exitSearch}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Exit search"
          >
            <Ionicons name="arrow-back" size={18} color={theme.colors.text} />
          </Pressable>
          <TextInput
            autoFocus
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search branches by name or place"
            placeholderTextColor={theme.colors.textPlaceholder}
            style={{
              flex: 1,
              marginLeft: 10,
              color: theme.colors.text,
              fontFamily: theme.typography.fontFamilyRegular,
              fontSize: 15,
              paddingVertical: 0,
            }}
            returnKeyType="search"
            accessibilityLabel="Search branches"
          />
          {searchQuery.length > 0 ? (
            <Pressable
              onPress={() => setSearchQuery("")}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Clear search"
            >
              <Ionicons
                name="close-circle"
                size={16}
                color={theme.colors.textMuted}
              />
            </Pressable>
          ) : null}
        </View>
      )}

      {!searchMode && activeCategory != null ? (
        <View
          style={[
            styles.activeCategoryChip,
            {
              backgroundColor: theme.colors.primary,
              borderRadius: theme.radii.pill,
            },
          ]}
        >
          <Text
            numberOfLines={1}
            style={{
              color: theme.colors.textOnPrimary,
              fontFamily: theme.typography.fontFamilySemiBold,
              fontSize: 12,
              letterSpacing: 0.3,
            }}
          >
            {CATEGORY_LABELS[activeCategory].toUpperCase()}
          </Text>
          <Pressable
            onPress={() => setActiveCategory(null)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Clear category filter"
          >
            <Ionicons
              name="close"
              size={14}
              color={theme.colors.textOnPrimary}
            />
          </Pressable>
        </View>
      ) : null}
    </BlurView>
  );

  return (
    <ScreenBackground>
      <PageHeader />
      <ScreenBody edges={["bottom"]} padding={0}>
        {branches.length === 0 ? (
          <View style={{ paddingHorizontal: 24 }}>
            {renderSearchArea()}
            {!hasLocation ? (
              <SetLocationCta onPress={() => setLocationOpen(true)} />
            ) : activeQuery.isLoading ? (
              <LoadingState />
            ) : (
              <EmptyBranchesState text={emptyStateText} />
            )}
          </View>
        ) : (
          <FlatList
            data={listData}
            keyExtractor={(item) =>
              item.type === "header" ? "header" : `branch-${item.branch.id}`
            }
            renderItem={({ item }) =>
              item.type === "header" ? (
                renderSearchArea()
              ) : (
                <BranchCard
                  branch={item.branch}
                  onPress={() =>
                    stackNavigation.navigate("BranchOffersDetail", {
                      branch: item.branch,
                    })
                  }
                />
              )
            }
            stickyHeaderIndices={[0]}
            onEndReached={() => activeQuery.fetchNextPage()}
            onEndReachedThreshold={0.5}
            ItemSeparatorComponent={({ leadingItem }) =>
              leadingItem.type === "header" ? null : (
                <View style={{ height: 20 }} />
              )
            }
            stickyHeaderHiddenOnScroll
            ListFooterComponent={
              activeQuery.isFetchingNextPage ? (
                <View style={styles.footerLoader}>
                  <ActivityIndicator color={theme.colors.primary} />
                </View>
              ) : null
            }
            contentContainerStyle={{
              paddingBottom: tabBarOffset,
              paddingHorizontal: 24,
            }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          />
        )}

        <CategoryFilterModal
          visible={categoryModalOpen}
          activeCategory={activeCategory}
          onApply={applyCategory}
          onDismiss={() => setCategoryModalOpen(false)}
        />
        <LocationModal
          visible={locationOpen}
          onDismiss={() => setLocationOpen(false)}
        />
      </ScreenBody>
    </ScreenBackground>
  );
}

function SetLocationCta({ onPress }: { onPress: () => void }) {
  const theme = useThemeTokens();
  return (
    <View
      style={[
        styles.emptyCard,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.surfaceBorder,
          borderRadius: theme.radii.lg,
        },
      ]}
    >
      <Ionicons name="navigate" size={32} color={theme.colors.primary} />
      <Text
        style={{
          color: theme.colors.text,
          fontFamily: theme.typography.fontFamilySemiBold,
          fontSize: 16,
          marginTop: 12,
          textAlign: "center",
        }}
      >
        Set your location to see nearby branches
      </Text>
      <Text
        style={{
          color: theme.colors.textSecondary,
          fontFamily: theme.typography.fontFamilyRegular,
          fontSize: 13,
          lineHeight: 19,
          marginTop: 8,
          textAlign: "center",
        }}
      >
        We'll show branches near you with their active offers.
      </Text>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.ctaButton,
          {
            backgroundColor: theme.colors.primary,
            borderRadius: theme.radii.md,
            opacity: pressed ? 0.85 : 1,
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel="Set your location"
      >
        <Text
          style={{
            color: theme.colors.textOnPrimary,
            fontFamily: theme.typography.fontFamilySemiBold,
            fontSize: 15,
          }}
        >
          Set location
        </Text>
      </Pressable>
    </View>
  );
}

function LoadingState() {
  const theme = useThemeTokens();
  return (
    <View style={styles.loadingWrap}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
      <Text
        style={{
          color: theme.colors.textMuted,
          fontFamily: theme.typography.fontFamilyRegular,
          fontSize: 13,
          marginTop: 12,
        }}
      >
        Loading nearby branches…
      </Text>
    </View>
  );
}

function EmptyBranchesState({ text }: { text: string }) {
  const theme = useThemeTokens();
  return (
    <View
      style={[
        styles.emptyCard,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.surfaceBorder,
          borderRadius: theme.radii.lg,
        },
      ]}
    >
      <Ionicons
        name="storefront-outline"
        size={32}
        color={theme.colors.textMuted}
      />
      <Text
        style={{
          color: theme.colors.text,
          fontFamily: theme.typography.fontFamilySemiBold,
          fontSize: 16,
          marginTop: 12,
          textAlign: "center",
        }}
      >
        {text}
      </Text>
      <Text
        style={{
          color: theme.colors.textSecondary,
          fontFamily: theme.typography.fontFamilyRegular,
          fontSize: 13,
          lineHeight: 19,
          marginTop: 8,
          textAlign: "center",
        }}
      >
        Try a different location — merchants in your area may not have active
        offers right now.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  searchAreaWrap: {
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    height: 44,
    borderWidth: 1,
  },
  filterButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  searchInputRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    height: 44,
    borderWidth: 1,
  },
  activeCategoryChip: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 12,
  },
  emptyCard: {
    alignItems: "center",
    padding: 24,
    marginTop: 24,
    borderWidth: 1,
  },
  ctaButton: {
    marginTop: 20,
    paddingHorizontal: 24,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  footerLoader: {
    paddingVertical: 16,
    alignItems: "center",
  },
});
