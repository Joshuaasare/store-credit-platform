import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
  type ListRenderItem,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { FavoritedConfig } from "@store-credit-platform/api-services";
import ScreenBackground from "../../shared/components/ScreenBackground";
import ScreenBody from "../../shared/components/ScreenBody";
import PageHeader from "../../shared/components/PageHeader";
import OfferCard from "../../shared/components/OfferCard";
import { useThemeTokens } from "../../shared/theme/ThemeContext";
import {
  offerImageUri,
  offerStripIcon,
  offerSubtitle,
  offerValueLabel,
} from "../../shared/utils/offers.utils";
import { useFavoritesFeed } from "./useFavoritesFeed";
import OfferDetailsModal from "../../shared/components/OfferDetailsModal";

export function FavoritesScreen() {
  const theme = useThemeTokens();
  const [selected, setSelected] = useState<FavoritedConfig | null>(null);

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

  const ItemSeparator = useCallback(() => <View style={styles.separator} />, []);

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
    if (feedQuery.isLoading || !feedQuery.isSuccess) return null;
    return (
      <View style={styles.empty}>
        <View
          style={[
            styles.emptyIconWrap,
            {
              backgroundColor: theme.colors.surfaceInput,
              borderRadius: theme.radii.pill,
            },
          ]}
        >
          <Ionicons
            name="heart-outline"
            size={32}
            color={theme.colors.textMuted}
          />
        </View>
        <Text
          style={{
            color: theme.colors.textSecondary,
            fontFamily: theme.typography.fontFamilyMedium,
            fontSize: 15,
            marginTop: 12,
          }}
        >
          No favorites yet
        </Text>
        <Text
          style={{
            color: theme.colors.textMuted,
            fontFamily: theme.typography.fontFamilyRegular,
            fontSize: 13,
            textAlign: "center",
            marginTop: 4,
          }}
        >
          Tap the heart on any offer to save it here.
        </Text>
      </View>
    );
  }, [feedQuery.isLoading, feedQuery.isSuccess, theme]);

  return (
    <ScreenBackground>
      <PageHeader />
      <ScreenBody edges={["bottom"]}>
        <FlatList
          data={items}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          ItemSeparatorComponent={ItemSeparator}
          ListFooterComponent={ListFooter}
          ListEmptyComponent={ListEmpty}
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
          contentContainerStyle={styles.listContent}
        />
      </ScreenBody>
      <OfferDetailsModal offer={selected} onClose={() => setSelected(null)} />
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingTop: 8,
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
  empty: {
    paddingVertical: 64,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    alignItems: "center",
    justifyContent: "center",
  },
});