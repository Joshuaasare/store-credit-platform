import { FlatList, StyleSheet, Text, View } from "react-native";
import OfferCard from "./OfferCard";
import { useThemeTokens } from "../../../shared/theme/ThemeContext";

export default function NearbyOffersSection({
  offers,
}: {
  offers: Array<{
    merchantName: string;
    offerCopy: string;
    accent: string;
    logoUrl: string | null;
  }>;
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
          Nearby Offers
        </Text>
      </View>

      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={offers}
        keyExtractor={(o, idx) => `${o.merchantName}-${idx}`}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.gap} />}
        renderItem={({ item }) => (
          <OfferCard
            merchantName={item.merchantName}
            offerCopy={item.offerCopy}
            accentText={item.accent}
            logoUrl={item.logoUrl}
          />
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
