import { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  FlatList,
  StyleSheet,
  Text,
  View,
  type ListRenderItem,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import type { FavoritedConfig } from "@store-credit-platform/api-services";
import ScreenBackground from "../../shared/components/ScreenBackground";
import ScreenBody from "../../shared/components/ScreenBody";
import PageHeader from "../../shared/components/PageHeader";
import OfferCard from "../../shared/components/OfferCard";
import EmptyState from "../../shared/components/EmptyState";
import { OfferCardSkeleton } from "../../shared/components/Skeleton";
import { useThemeTokens } from "../../shared/theme/ThemeContext";
import {
  offerImageUri,
  offerStripIcon,
  offerSubtitle,
  offerValueLabel,
} from "../../shared/utils/offers.utils";
import { useFavoritesFeed } from "./useFavoritesFeed";
import type { TabStackParamList } from "../../navigation/TabNavigator";
import OfferDetailsModal from "../../shared/components/OfferDetailsModal";
import { useOffsets } from "../../shared/hooks/useOffsets";

// Headline collapses fully within this scroll distance and only returns
// when the list is back at the very top.
const HERO_COLLAPSE_RANGE = 60;

export function FavoritesScreen() {
  const theme = useThemeTokens();
  const navigation =
    useNavigation<BottomTabNavigationProp<TabStackParamList>>();
  const [selected, setSelected] = useState<FavoritedConfig | null>(null);
  const { tabBarOffset, bottomOffset } = useOffsets();
  const scrollY = useRef(new Animated.Value(0)).current;

  const heroStyle = {
    transform: [
      {
        translateY: scrollY.interpolate({
          inputRange: [0, HERO_COLLAPSE_RANGE],
          outputRange: [0, -HERO_COLLAPSE_RANGE],
          extrapolate: "clamp",
        }),
      },
    ],
    opacity: scrollY.interpolate({
      inputRange: [0, HERO_COLLAPSE_RANGE * 0.8],
      outputRange: [1, 0],
      extrapolate: "clamp",
    }),
  };

  const feedQuery = useFavoritesFeed();

  const items = useMemo<FavoritedConfig[]>(() => {
    const pages = feedQuery.data?.pages ?? [];
    const out: FavoritedConfig[] = [];
    for (const page of pages) {
      if (page.success) out.push(...page.data.rows);
    }
    return out;
  }, [feedQuery.data]);

  const keyExtractor = useCallback(
    (item: FavoritedConfig) => `${item.config_type}-${item.config.id}`,
    [],
  );

  const renderItem = useCallback<ListRenderItem<FavoritedConfig>>(
    ({ item }) => (
      <OfferCard
        value={offerValueLabel(item)}
        subtitle={offerSubtitle(item)}
        stripIcon={offerStripIcon(item)}
        imageUri={offerImageUri(item)}
        merchantName={item.merchant?.name ?? "Merchant"}
        merchantLogoUrl={item.merchant?.logo_url ?? null}
        onPress={() => setSelected(item)}
        style={styles.fullWidthCard}
      />
    ),
    [],
  );

  const ItemSeparator = useCallback(
    () => <View style={styles.separator} />,
    [],
  );

  const ListFooter = useCallback(() => {
    if ((feedQuery.data?.pages.length ?? 0) <= 1) return null;
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
          That’s all your favorites.
        </Text>
      );
    }
    return null;
  }, [feedQuery, theme]);

  const ListEmpty = useCallback(() => {
    if (!feedQuery.isSuccess) {
      if (!feedQuery.isLoading) return null;
      return (
        <View style={styles.skeletonList}>
          <OfferCardSkeleton />
          <OfferCardSkeleton />
          <OfferCardSkeleton />
        </View>
      );
    }
    return (
      <EmptyState
        icon="heart-outline"
        title="No favorites yet"
        message="Tap the heart on any offer to save it here."
        actionLabel="Explore offers"
        onAction={() => navigation.navigate("Explore")}
      />
    );
  }, [feedQuery.isLoading, feedQuery.isSuccess, navigation]);

  return (
    <ScreenBackground>
      <PageHeader />
      <ScreenBody edges={["bottom"]}>
        <Animated.View style={[styles.heroCopy, heroStyle]}>
          <View style={styles.heroRow}>
            <Ionicons
              name="heart-outline"
              size={40}
              color={theme.colors.primary}
            />
            <View style={styles.heroTextCol}>
              <Text
                style={{
                  color: theme.colors.text,
                  fontFamily: theme.typography.fontFamilyBold,
                  fontSize: 20,
                  lineHeight: 26,
                  letterSpacing: -0.5,
                }}
              >
                Your <Text style={{ color: theme.colors.primary }}>favorite</Text>{" "}
                offers
              </Text>
              <Text
                numberOfLines={1}
                style={{
                  color: theme.colors.textMuted,
                  fontFamily: theme.typography.fontFamilyRegular,
                  fontSize: 13,
                  lineHeight: 17,
                  marginTop: 2,
                }}
              >
                Offers you've hearted from merchants
              </Text>
            </View>
          </View>
        </Animated.View>
        <FlatList
          data={items}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          ItemSeparatorComponent={ItemSeparator}
          ListFooterComponent={ListFooter}
          ListEmptyComponent={ListEmpty}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            // JS driver — the native driver rejects a VirtualizedList event target.
            { useNativeDriver: false },
          )}
          scrollEventThrottle={16}
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
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            ...styles.listContent,

            paddingBottom: tabBarOffset + bottomOffset,
          }}
        />
      </ScreenBody>
      <OfferDetailsModal offer={selected} onClose={() => setSelected(null)} />
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  heroCopy: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1,
    paddingTop: 15,
    paddingHorizontal: 24,
  },
  heroRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  heroTextCol: {
    flex: 1,
  },
  listContent: {
    paddingTop: 80,
    paddingBottom: 8,
  },
  separator: {
    height: 15,
    marginHorizontal: 7,
  },
  fullWidthCard: {
    width: "100%",
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  skeletonList: {
    paddingTop: 80,
    gap: 15,
  },
});
