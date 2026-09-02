import { useCallback, useMemo } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import type { NearbyOfferRow } from "@store-credit-platform/api-services";
import NearbyOfferCard from "../../offers/NearbyOfferCard";
import { useNearbyOffersFeed } from "../../offers/useNearbyOffersFeed";
import { useThemeTokens } from "../../../shared/theme/ThemeContext";
import type { AppStackParamList } from "../../../navigation/RootNavigator";

const HOME_PREVIEW_COUNT = 6;

export default function NearbyOffersSection() {
  const theme = useThemeTokens();
  const navigation =
    useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const { hasLocation, query } = useNearbyOffersFeed();

  const offers = useMemo<NearbyOfferRow[]>(() => {
    if (!query.data) return [];
    const rows = query.data.pages.flatMap((page) =>
      page.success ? page.data.rows : [],
    );
    return rows.slice(0, HOME_PREVIEW_COUNT);
  }, [query.data]);

  const openBrowseAll = useCallback(() => {
    navigation.navigate("NearbyOffers");
  }, [navigation]);

  const openOffer = useCallback(
    (offer: NearbyOfferRow) => {
      navigation.navigate("OfferBranches", {
        config_type: offer.config_type,
        config_id: offer.config.id,
      });
    },
    [navigation],
  );

  if (!hasLocation || offers.length === 0) return null;

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
          Nearby Offers
        </Text>
        <Pressable
          onPress={openBrowseAll}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="See all nearby offers"
        >
          <Text
            style={{
              color: theme.colors.primary,
              fontFamily: theme.typography.fontFamilySemiBold,
              fontSize: 13,
            }}
          >
            See all
          </Text>
        </Pressable>
      </View>

      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={offers}
        keyExtractor={(o) => `${o.config_type}-${o.config.id}`}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.gap} />}
        renderItem={({ item }) => (
          <NearbyOfferCard offer={item} onPress={() => openOffer(item)} />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: {},
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  listContent: {
    paddingHorizontal: 0,
  },
  gap: {
    width: 12,
  },
});