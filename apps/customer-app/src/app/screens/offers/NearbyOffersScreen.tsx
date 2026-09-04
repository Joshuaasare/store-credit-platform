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
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { NearbyOfferRow } from "@store-credit-platform/api-services";
import ScreenBackground from "../../shared/components/ScreenBackground";
import ScreenBody from "../../shared/components/ScreenBody";
import PageHeader from "../../shared/components/PageHeader";
import OfferCard3 from "../../shared/components/OfferCard3";
import {
  offerImageUri,
  offerStripIcon,
  offerSubtitle,
  offerValueLabel,
} from "../../shared/utils/offers.utils";
import NearbyOfferDetailsModal from "./NearbyOfferDetailsModal";
import { useNearbyOffersFeed } from "./useNearbyOffersFeed";
import { useThemeTokens } from "../../shared/theme/ThemeContext";
import type { AppStackParamList } from "../../navigation/RootNavigator";
import OfferCard from "../../shared/components/OfferCard";
import OfferCard2 from "../../shared/components/OfferCard2";

// Headline collapses fully within this scroll distance and only returns
// when the list is back at the very top.
const HERO_COLLAPSE_RANGE = 60;

export function NearbyOffersScreen() {
  const theme = useThemeTokens();
  const navigation =
    useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const { hasLocation, query } = useNearbyOffersFeed();
  const [selected, setSelected] = useState<NearbyOfferRow | null>(null);
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

  const offers = useMemo<NearbyOfferRow[]>(() => {
    if (!query.data) return [];
    return query.data.pages.flatMap((page) =>
      page.success ? page.data.rows : [],
    );
  }, [query.data]);

  const renderItem = useCallback<ListRenderItem<NearbyOfferRow>>(
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
      <PageHeader backLabel="Back" onBackPress={() => navigation.goBack()} />
      <ScreenBody edges={["bottom"]}>
        <View style={styles.bodyWrap}>
          <Animated.View style={[styles.heroCopy, heroStyle]}>
            <View style={styles.heroRow}>
              <Ionicons
                name="cart-outline"
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
                  Explore deals{" "}
                  <Text style={{ color: theme.colors.primary }}>near you</Text>
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
                  Deals from merchants close to you
                </Text>
              </View>
            </View>
          </Animated.View>
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
              onScroll={Animated.event(
                [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                // JS driver — the native driver rejects a VirtualizedList event target.
                { useNativeDriver: false },
              )}
              scrollEventThrottle={16}
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

          <NearbyOfferDetailsModal
            offer={selected}
            onClose={() => setSelected(null)}
          />
        </View>
      </ScreenBody>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  bodyWrap: {
    flex: 1,
  },
  heroCopy: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1,
    paddingTop: 15,
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
  fullWidthCard: {
    width: "100%",
  },
  separator: {
    height: 15,
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
