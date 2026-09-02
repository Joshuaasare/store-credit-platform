import { useCallback, useMemo } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
  type ListRenderItem,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { NearbyOfferRow } from "@store-credit-platform/api-services";
import ScreenBackground from "../../shared/components/ScreenBackground";
import ScreenBody from "../../shared/components/ScreenBody";
import PageHeader from "../../shared/components/PageHeader";
import NearbyOfferCard from "./NearbyOfferCard";
import { useNearbyOffersFeed } from "./useNearbyOffersFeed";
import { useThemeTokens } from "../../shared/theme/ThemeContext";
import type { AppStackParamList } from "../../navigation/RootNavigator";

export function NearbyOffersScreen() {
  const theme = useThemeTokens();
  const navigation =
    useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const { hasLocation, query } = useNearbyOffersFeed();

  const offers = useMemo<NearbyOfferRow[]>(() => {
    if (!query.data) return [];
    return query.data.pages.flatMap((page) =>
      page.success ? page.data.rows : [],
    );
  }, [query.data]);

  const openOffer = useCallback(
    (offer: NearbyOfferRow) => {
      navigation.navigate("OfferBranches", {
        config_type: offer.config_type,
        config_id: offer.config.id,
      });
    },
    [navigation],
  );

  const renderItem = useCallback<ListRenderItem<NearbyOfferRow>>(
    ({ item }) => <NearbyOfferCard offer={item} onPress={() => openOffer(item)} style={styles.fullWidthCard} />,
    [openOffer],
  );

  const ItemSeparator = useCallback(
    () => (
      <View
        style={[styles.separator, { backgroundColor: theme.colors.surfaceBorder }]}
      />
    ),
    [theme],
  );

  const ListFooter = useCallback(() => {
    if ((query.data?.pages.length ?? 0) <= 1) return null;
    if (query.isFetchingNextPage) {
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
    return null;
  }, [query, theme]);

  const ListEmpty = useCallback(() => {
    if (query.isLoading || !query.isSuccess) return null;
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
            name="pricetags-outline"
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
          No offers nearby yet
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
          Update your location in the header to see deals near you.
        </Text>
      </View>
    );
  }, [query.isLoading, query.isSuccess, theme]);

  return (
    <ScreenBackground>
      <PageHeader
        backLabel="Home"
        onBackPress={() => navigation.goBack()}
      />
      <ScreenBody edges={["bottom"]}>
        {!hasLocation ? (
          <ListEmpty />
        ) : query.isLoading ? (
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
              Loading nearby offers…
            </Text>
          </View>
        ) : (
          <FlatList
            data={offers}
            keyExtractor={(o) => `${o.config_type}-${o.config.id}`}
            renderItem={renderItem}
            ItemSeparatorComponent={ItemSeparator}
            ListFooterComponent={ListFooter}
            ListEmptyComponent={ListEmpty}
            onEndReached={() => {
              if (query.hasNextPage && !query.isFetchingNextPage) {
                query.fetchNextPage();
              }
            }}
            onEndReachedThreshold={0.5}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
          />
        )}
      </ScreenBody>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingTop: 8,
    paddingBottom: 8,
  },
  fullWidthCard: {
    width: "100%",
  },
  separator: {
    height: 1,
    marginHorizontal: 7,
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
  loadingWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
});