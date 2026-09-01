import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type ListRenderItem,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { FavoritedConfig } from "@store-credit-platform/api-services";
import ScreenBackground from "../../shared/components/ScreenBackground";
import ScreenBody from "../../shared/components/ScreenBody";
import PageHeader from "../../shared/components/PageHeader";
import MerchantAvatar from "../../shared/components/MerchantAvatar";
import { useCustomerFavorites } from "../../shared/hooks/useCustomerFavorites";
import { useThemeTokens } from "../../shared/theme/ThemeContext";
import { cashbackHeadline } from "../../shared/utils/configDisplay";
import { useFavoritesFeed } from "./useFavoritesFeed";
import FavoriteDetailsModal from "./FavoriteDetailsModal";

export function FavoritesScreen() {
  const theme = useThemeTokens();
  const favorites = useCustomerFavorites();
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
      <FavoriteRow
        item={item}
        favorited={favorites.isFavorited(item.config_type, item.config.id)}
        pending={favorites.pendingFor(item.config_type, item.config.id)}
        onToggleFavorite={() =>
          favorites.toggleFavorite(item.config_type, item.config.id)
        }
        onPress={() => setSelected(item)}
      />
    ),
    [favorites],
  );

  const ItemSeparator = useCallback(
    () => (
      <View
        style={[
          styles.separator,
          { backgroundColor: theme.colors.surfaceBorder },
        ]}
      />
    ),
    [theme],
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
      <FavoriteDetailsModal item={selected} onClose={() => setSelected(null)} />
    </ScreenBackground>
  );
}

// Same row anatomy as MerchantActivityRow: ringed avatar, title + meta stack,
// trailing action — inside one shared GlassCard like the credits lists.
function FavoriteRow({
  item,
  favorited,
  pending,
  onToggleFavorite,
  onPress,
}: {
  item: FavoritedConfig;
  favorited: boolean;
  pending: boolean;
  onToggleFavorite: () => void;
  onPress: () => void;
}) {
  const theme = useThemeTokens();

  const merchantName = item.merchant?.name ?? "Merchant";
  const logoUrl = item.merchant?.logo_url ?? null;
  const title =
    item.config_type === "fixed"
      ? item.config.title?.trim() || "Discount offer"
      : cashbackHeadline(item.config);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
    >
      <View
        style={[
          styles.ring,
          {
            borderColor: theme.colors.surfaceBorder,
            backgroundColor: theme.colors.surface,
          },
        ]}
      >
        <MerchantAvatar
          merchantName={merchantName}
          logoUrl={logoUrl}
          idSeed={item.merchant?.id}
          size={32}
        />
      </View>
      <View style={styles.center}>
        <Text
          numberOfLines={1}
          style={{
            color: theme.colors.text,
            fontFamily: theme.typography.fontFamilySemiBold,
            fontSize: 14,
            letterSpacing: 0.1,
          }}
        >
          {title}
        </Text>
        <Text
          numberOfLines={1}
          style={{
            color: theme.colors.textMuted,
            fontFamily: theme.typography.fontFamilyRegular,
            fontSize: 12,
            marginTop: 2,
          }}
        >
          {merchantName}
        </Text>
      </View>
      <TouchableOpacity
        onPress={onToggleFavorite}
        disabled={pending}
        accessibilityRole="button"
        accessibilityState={{ selected: favorited }}
        accessibilityLabel="Remove from favorites"
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        style={styles.heartButton}
      >
        <Ionicons
          name={favorited ? "heart" : "heart-outline"}
          size={20}
          color={favorited ? theme.colors.error : theme.colors.textMuted}
        />
      </TouchableOpacity>
      <Ionicons
        name="chevron-forward"
        size={16}
        color={theme.colors.textMuted}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingTop: 8,
    paddingBottom: 8,
  },
  separator: {
    height: 1,
    marginHorizontal: 7,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    gap: 8,
  },
  ring: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  center: {
    flex: 1,
    minWidth: 0,
    marginLeft: 4,
  },
  heartButton: {
    marginRight: 6,
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